import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, type ButtonInteraction } from "discord.js";
import { prisma } from "../database/prisma.js";
import { isAdmin } from "../permissions/authorization.js";
import type { Command } from "./types.js";
import { replyError, successEmbed } from "../utils/discord.js";

const validHttpUrl = (value: string) => {
  try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:"; } catch { return false; }
};

export const teamCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("team")
    .setDescription("Manage league teams")
    .addSubcommand((subcommand) => subcommand.setName("create").setDescription("Create a team")
      .addStringOption((option) => option.setName("name").setDescription("Unique team name").setRequired(true))
      .addRoleOption((option) => option.setName("role").setDescription("Team's Discord role").setRequired(true))
      .addStringOption((option) => option.setName("logo").setDescription("Optional HTTPS logo URL")))
    .addSubcommand((subcommand) => subcommand.setName("info").setDescription("Show team information")
      .addStringOption((option) => option.setName("team").setDescription("Team name").setAutocomplete(true).setRequired(true)))
    .addSubcommand((subcommand) => subcommand.setName("delete").setDescription("Archive a team and preserve its history")
      .addStringOption((option) => option.setName("team").setDescription("Team name").setAutocomplete(true).setRequired(true))) as SlashCommandBuilder,

  async execute(interaction) {
    if (!interaction.inGuild() || !interaction.guild) return void (await replyError(interaction, "This command can only be used in a server."));
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === "create") {
      if (!(await isAdmin(member))) return void (await replyError(interaction, "You do not have permission to perform this action."));
      const name = interaction.options.getString("name", true).trim();
      const role = interaction.options.getRole("role", true);
      const logoUrl = interaction.options.getString("logo")?.trim();
      if (name.length < 2 || name.length > 60) return void (await replyError(interaction, "Team names must be 2–60 characters."));
      if (logoUrl && !validHttpUrl(logoUrl)) return void (await replyError(interaction, "Logo must be a valid HTTP(S) URL."));
      try {
        const team = await prisma.team.create({ data: { name, discordRoleId: role.id, logoUrl } });
        await interaction.reply({ embeds: [successEmbed("Team created", `${team.name} is linked to ${role}.`)], ephemeral: true });
      } catch (error: unknown) {
        const message = error instanceof Error && error.message.includes("Unique constraint")
          ? "That team name or Discord role is already assigned." : "Unable to create the team. Please try again.";
        await replyError(interaction, message);
      }
      return;
    }

    if (subcommand === "delete") {
      if (!(await isAdmin(member))) return void (await replyError(interaction, "You do not have permission to perform this action."));
      const team = await prisma.team.findFirst({
        where: { name: { equals: interaction.options.getString("team", true), mode: "insensitive" }, isArchived: false },
        include: { _count: { select: { players: true, offers: true, homeMatches: true, awayMatches: true } } },
      });
      if (!team) return void (await replyError(interaction, "That team does not exist or has already been archived."));
      const postponementCount = await prisma.postponement.count({
        where: { match: { OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }] } },
      });
      const impact = [
        `${team._count.players} player(s)`,
        `${team.managerId ? 1 : 0} manager assignment`,
        `${team.assistantManagerId ? 1 : 0} assistant-manager assignment`,
        `${team._count.offers} offer(s)`,
        `${team._count.homeMatches + team._count.awayMatches} match(es)`,
        `${postponementCount} postponement record(s)`,
      ].join(" • ");
      const confirmId = `team-delete-confirm:${team.id}:${interaction.user.id}`;
      const cancelId = `team-delete-cancel:${team.id}:${interaction.user.id}`;
      await interaction.reply({
        content: `Archive **${team.name}**? This preserves all history but removes it from active commands.\n\nLinked records: ${impact}`,
        components: [new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId(confirmId).setLabel("Archive team").setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId(cancelId).setLabel("Cancel").setStyle(ButtonStyle.Secondary),
        )],
        ephemeral: true,
      });
      return;
    }

    const name = interaction.options.getString("team", true);
    const team = await prisma.team.findFirst({
      where: { name: { equals: name, mode: "insensitive" }, isArchived: false },
      include: { manager: true, assistantManager: true, _count: { select: { players: true } } },
    });
    if (!team) return void (await replyError(interaction, "That team does not exist."));
    await interaction.reply({
      embeds: [successEmbed(team.name, [
        `Role: <@&${team.discordRoleId}>`,
        `Manager: ${team.manager ? `<@${team.manager.discordId}>` : "Unassigned"}`,
        `Assistant Manager: ${team.assistantManager ? `<@${team.assistantManager.discordId}>` : "Unassigned"}`,
        `Players: ${team._count.players}`,
      ].join("\n")).setThumbnail(team.logoUrl ?? null)],
    });
  },
};

export async function handleTeamDeleteButton(interaction: ButtonInteraction) {
  const [action, teamId, requesterId] = interaction.customId.split(":");
  if (!action?.startsWith("team-delete-") || !teamId || !requesterId) return false;
  if (interaction.user.id !== requesterId) {
    await interaction.reply({ content: "❌ Only the administrator who started this deletion can use these buttons.", ephemeral: true });
    return true;
  }
  if (!interaction.inGuild() || !interaction.guild) {
    await interaction.reply({ content: "❌ This action can only be used in a server.", ephemeral: true });
    return true;
  }
  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (!(await isAdmin(member))) {
    await interaction.reply({ content: "❌ You do not have permission to perform this action.", ephemeral: true });
    return true;
  }
  if (action === "team-delete-cancel") {
    await interaction.update({ content: "Team archive cancelled.", components: [] });
    return true;
  }
  if (action !== "team-delete-confirm") return false;

  const archived = await prisma.$transaction(async (transaction) => {
    const team = await transaction.team.findFirst({ where: { id: teamId, isArchived: false } });
    if (!team) return null;
    const teamCase = await transaction.case.create({ data: {} });
    await transaction.team.update({ where: { id: team.id }, data: { isArchived: true } });
    await transaction.auditLog.create({
      data: {
        action: "TEAM_DELETED",
        actorId: interaction.user.id,
        targetId: team.id,
        teamId: team.id,
        caseId: teamCase.id,
        details: { teamName: team.name, mode: "archived" },
      },
    });
    return { name: team.name, caseNumber: teamCase.number };
  });
  if (!archived) {
    await interaction.update({ content: "❌ This team has already been archived or no longer exists.", components: [] });
    return true;
  }
  await interaction.update({
    embeds: [successEmbed("Team archived", `**${archived.name}** has been archived. Historical records were preserved.\nCase #${archived.caseNumber}`)],
    content: "",
    components: [],
  });
  return true;
}

import { SlashCommandBuilder } from "discord.js";
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

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, type ButtonInteraction, type ChatInputCommandInteraction, type Role } from "discord.js";
import { prisma } from "../database/prisma.js";
import { isAdmin } from "../permissions/authorization.js";
import type { Command } from "./types.js";
import { replyError, successEmbed } from "../utils/discord.js";

type ManagementKind = "manager" | "assistant";

function roleIssue(role: Role | undefined) {
  if (!role) return "A configured Discord role no longer exists. Configure it again before assigning staff.";
  if (!role.editable) return `I cannot manage the ${role.name} role. Move the bot's role above it and grant the bot Manage Roles.`;
  return null;
}

async function requireRoleSetup(interaction: ChatInputCommandInteraction, teamRoleId: string, kind: ManagementKind): Promise<{ error: string } | { managementRoleId: string; teamRoleId: string }> {
  const configuration = await prisma.configuration.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });
  const managementRoleId = kind === "manager" ? configuration.managerRoleId : configuration.assistantManagerRoleId;
  if (!managementRoleId) return { error: `Set the ${kind === "manager" ? "Manager" : "Assistant Manager"} role first.` };
  const teamRole = interaction.guild?.roles.cache.get(teamRoleId);
  const managementRole = interaction.guild?.roles.cache.get(managementRoleId);
  const problem = roleIssue(teamRole) ?? roleIssue(managementRole);
  if (problem) return { error: problem };
  return { managementRoleId, teamRoleId };
}

async function configureRole(interaction: ChatInputCommandInteraction, kind: ManagementKind) {
  if (!interaction.inGuild() || !interaction.guild) return void (await replyError(interaction, "This command can only be used in a server."));
  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (!(await isAdmin(member))) return void (await replyError(interaction, "You do not have permission to perform this action."));
  const selectedRole = interaction.options.getRole("role", true);
  const role = interaction.guild.roles.cache.get(selectedRole.id);
  if (!role) return void (await replyError(interaction, "That Discord role no longer exists."));
  const problem = roleIssue(role);
  if (problem) return void (await replyError(interaction, problem));
  await prisma.configuration.upsert({
    where: { id: 1 },
    create: kind === "manager" ? { id: 1, managerRoleId: role.id } : { id: 1, assistantManagerRoleId: role.id },
    update: kind === "manager" ? { managerRoleId: role.id } : { assistantManagerRoleId: role.id },
  });
  await interaction.reply({ embeds: [successEmbed(`${kind === "manager" ? "Manager" : "Assistant Manager"} role configured`, `${role} will be used for league staff assignments.`)], ephemeral: true });
}

function roleCommand(name: "manager" | "assistant", kind: ManagementKind): Command {
  return {
    data: new SlashCommandBuilder().setName(name).setDescription(`Configure the ${kind} role`)
      .addSubcommand((subcommand) => subcommand.setName("role").setDescription(`Set the Discord role for ${kind}s`)
        .addRoleOption((option) => option.setName("role").setDescription("Discord role").setRequired(true))),
    execute: (interaction) => configureRole(interaction, kind),
  };
}

export const managerCommand = roleCommand("manager", "manager");
export const assistantCommand = roleCommand("assistant", "assistant");

export const assignCommand: Command = {
  data: new SlashCommandBuilder().setName("assign").setDescription("Assign league management")
    .addSubcommand((subcommand) => subcommand.setName("manager").setDescription("Assign a team manager")
      .addUserOption((option) => option.setName("player").setDescription("Discord member to assign").setRequired(true))
      .addStringOption((option) => option.setName("team").setDescription("Team name").setAutocomplete(true).setRequired(true))
      .addBooleanOption((option) => option.setName("replace").setDescription("Replace the current manager")))
    .addSubcommand((subcommand) => subcommand.setName("assistant").setDescription("Assign an assistant manager")
      .addUserOption((option) => option.setName("player").setDescription("Discord member to assign").setRequired(true))
      .addStringOption((option) => option.setName("team").setDescription("Team name").setAutocomplete(true).setRequired(true))
      .addBooleanOption((option) => option.setName("replace").setDescription("Replace the current assistant manager"))),
  async execute(interaction) {
    if (!interaction.inGuild() || !interaction.guild) return void (await replyError(interaction, "This command can only be used in a server."));
    const kind: ManagementKind = interaction.options.getSubcommand() === "manager" ? "manager" : "assistant";
    const actingMember = await interaction.guild.members.fetch(interaction.user.id);
    const target = interaction.options.getUser("player", true);
    if (target.bot) return void (await replyError(interaction, "Bots cannot be assigned as Managers or Assistant Managers."));
    const targetMember = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!targetMember) return void (await replyError(interaction, "That player is not a member of this server."));
    const team = await prisma.team.findFirst({ where: { name: { equals: interaction.options.getString("team", true), mode: "insensitive" }, isArchived: false } });
    if (!team) return void (await replyError(interaction, "That active team does not exist."));
    const administrator = await isAdmin(actingMember);
    if (kind === "manager" && !administrator) return void (await replyError(interaction, "You do not have permission to perform this action."));
    if (kind === "assistant" && !administrator && team.managerId !== interaction.user.id) return void (await replyError(interaction, "Only this team's Manager or an Administrator can assign an Assistant Manager."));
    const setup = await requireRoleSetup(interaction, team.discordRoleId, kind);
    if ("error" in setup) return void (await replyError(interaction, setup.error));

    const currentStaffId = kind === "manager" ? team.managerId : team.assistantManagerId;
    if (currentStaffId && currentStaffId !== target.id && !interaction.options.getBoolean("replace")) {
      return void (await replyError(interaction, `This team already has a ${kind}. Use \`replace: true\` to replace them.`));
    }
    if (currentStaffId === target.id) return void (await replyError(interaction, `That player is already this team's ${kind}.`));
    if (kind === "manager" && team.assistantManagerId === target.id) {
      return void (await replyError(interaction, "That player is already this team's Assistant Manager. Sack them from that role before assigning them as Manager."));
    }
    if (kind === "assistant" && team.managerId === target.id) {
      return void (await replyError(interaction, "That player is already this team's Manager and cannot also be its Assistant Manager."));
    }
    const otherManagement = await prisma.team.findFirst({
      where: { isArchived: false, OR: [{ managerId: target.id }, { assistantManagerId: target.id }] },
      select: { id: true, name: true, managerId: true, assistantManagerId: true },
    });
    if (otherManagement && otherManagement.id !== team.id) return void (await replyError(interaction, `That player already manages **${otherManagement.name}**.`));
    const player = await prisma.player.findUnique({ where: { discordId: target.id }, select: { teamId: true } });
    if (player?.teamId && player.teamId !== team.id) return void (await replyError(interaction, "That player belongs to another team. Complete a release or transfer before assigning them."));

    const previousStaff = currentStaffId ? await interaction.guild.members.fetch(currentStaffId).catch(() => null) : null;
    try {
      await targetMember.roles.add([setup.teamRoleId, setup.managementRoleId]);
      if (previousStaff) await previousStaff.roles.remove(setup.managementRoleId);
    } catch {
      return void (await replyError(interaction, "I could not update Discord roles. Check that my role is above the team and staff roles."));
    }
    const assigned = await prisma.$transaction(async (transaction) => {
      const teamCase = await transaction.case.create({ data: {} });
      await transaction.player.upsert({ where: { discordId: target.id }, create: { discordId: target.id, teamId: team.id }, update: { teamId: team.id } });
      const updatedTeam = await transaction.team.update({
        where: { id: team.id },
        data: kind === "manager"
          ? { managerId: target.id, ...(team.assistantManagerId === target.id ? { assistantManagerId: null } : {}) }
          : { assistantManagerId: target.id },
      });
      await transaction.auditLog.create({
        data: { action: kind === "manager" ? "MANAGER_ASSIGNED" : "ASSISTANT_ASSIGNED", actorId: interaction.user.id, targetId: target.id, teamId: team.id, caseId: teamCase.id, details: { replacedUserId: currentStaffId } },
      });
      return { team: updatedTeam, caseNumber: teamCase.number };
    });
    await interaction.reply({ embeds: [successEmbed(`${kind === "manager" ? "Manager" : "Assistant Manager"} assigned`, `${target} now manages **${assigned.team.name}**.\nCase #${assigned.caseNumber}`)], ephemeral: true });
  },
};

export const sackCommand: Command = {
  data: new SlashCommandBuilder().setName("sack").setDescription("Remove a Manager or Assistant Manager")
    .addUserOption((option) => option.setName("player").setDescription("Manager or Assistant Manager to remove").setRequired(true)),
  async execute(interaction) {
    if (!interaction.inGuild() || !interaction.guild) return void (await replyError(interaction, "This command can only be used in a server."));
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const target = interaction.options.getUser("player", true);
    const team = await prisma.team.findFirst({ where: { isArchived: false, OR: [{ managerId: target.id }, { assistantManagerId: target.id }] } });
    if (!team) return void (await replyError(interaction, "That player is not an active Manager or Assistant Manager."));
    const kind: ManagementKind = team.managerId === target.id ? "manager" : "assistant";
    const administrator = await isAdmin(member);
    if (!administrator && (kind === "manager" || team.managerId !== interaction.user.id)) return void (await replyError(interaction, "You do not have permission to perform this action."));
    await interaction.reply({
      content: `Remove ${target} as **${team.name}**'s ${kind === "manager" ? "Manager" : "Assistant Manager"}?`,
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`sack-confirm:${target.id}:${interaction.user.id}`).setLabel("Confirm sack").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`sack-cancel:${target.id}:${interaction.user.id}`).setLabel("Cancel").setStyle(ButtonStyle.Secondary),
      )], ephemeral: true,
    });
  },
};

export async function handleSackButton(interaction: ButtonInteraction) {
  const [action, playerId, requesterId] = interaction.customId.split(":");
  if (!action?.startsWith("sack-") || !playerId || !requesterId) return false;
  if (interaction.user.id !== requesterId) { await interaction.reply({ content: "❌ Only the user who started this action can use these buttons.", ephemeral: true }); return true; }
  if (action === "sack-cancel") { await interaction.update({ content: "Sacking cancelled.", components: [] }); return true; }
  if (!interaction.inGuild() || !interaction.guild) { await interaction.reply({ content: "❌ This action can only be used in a server.", ephemeral: true }); return true; }
  const member = await interaction.guild.members.fetch(interaction.user.id);
  const team = await prisma.team.findFirst({ where: { isArchived: false, OR: [{ managerId: playerId }, { assistantManagerId: playerId }] } });
  if (!team) { await interaction.update({ content: "❌ That management assignment no longer exists.", components: [] }); return true; }
  const kind: ManagementKind = team.managerId === playerId ? "manager" : "assistant";
  const administrator = await isAdmin(member);
  if (!administrator && (kind === "manager" || team.managerId !== interaction.user.id)) { await interaction.reply({ content: "❌ You do not have permission to perform this action.", ephemeral: true }); return true; }
  const configuration = await prisma.configuration.findUnique({ where: { id: 1 } });
  const roleId = kind === "manager" ? configuration?.managerRoleId : configuration?.assistantManagerRoleId;
  const targetMember = await interaction.guild.members.fetch(playerId).catch(() => null);
  if (targetMember && roleId && interaction.guild.roles.cache.get(roleId)?.editable) await targetMember.roles.remove(roleId).catch(() => null);
  const removed = await prisma.$transaction(async (transaction) => {
    const teamCase = await transaction.case.create({ data: {} });
    await transaction.team.update({ where: { id: team.id }, data: kind === "manager" ? { managerId: null } : { assistantManagerId: null } });
    await transaction.auditLog.create({ data: { action: "SACKED", actorId: interaction.user.id, targetId: playerId, teamId: team.id, caseId: teamCase.id, details: { role: kind } } });
    return teamCase.number;
  });
  await interaction.update({ embeds: [successEmbed("Staff member removed", `<@${playerId}> is no longer **${team.name}**'s ${kind === "manager" ? "Manager" : "Assistant Manager"}.\nCase #${removed}`)], content: "", components: [] });
  return true;
}

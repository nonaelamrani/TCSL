import { SlashCommandBuilder } from "discord.js";
import { prisma } from "../database/prisma.js";
import type { Command } from "./types.js";
import { replyError, successEmbed } from "../utils/discord.js";

export const rosterCommand: Command = {
  data: new SlashCommandBuilder().setName("roster").setDescription("Show a team's roster")
    .addStringOption((option) => option.setName("team").setDescription("Team name").setAutocomplete(true).setRequired(true)),
  async execute(interaction) {
    const team = await prisma.team.findFirst({
      where: { name: { equals: interaction.options.getString("team", true), mode: "insensitive" }, isArchived: false },
      include: { manager: true, assistantManager: true, players: { orderBy: { joinedAt: "asc" } } },
    });
    if (!team) return void (await replyError(interaction, "That team does not exist."));
    const players = team.players.filter((player) => player.discordId !== team.managerId && player.discordId !== team.assistantManagerId);
    await interaction.reply({ embeds: [successEmbed(`${team.name} roster`, [
      `Manager: ${team.manager ? `<@${team.manager.discordId}>` : "Unassigned"}`,
      `Assistant: ${team.assistantManager ? `<@${team.assistantManager.discordId}>` : "Unassigned"}`,
      `Players: ${players.length ? players.map((player) => `<@${player.discordId}>`).join(", ") : "None"}`,
    ].join("\n"))] });
  },
};

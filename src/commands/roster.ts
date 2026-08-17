import { SlashCommandBuilder } from "discord.js";
import { prisma } from "../database/prisma.js";
import type { Command } from "./types.js";
import { leagueEmbed, replyError } from "../utils/discord.js";

function splitRoster(players: string[]) {
  const chunks: string[] = [];
  let current = "";
  for (const player of players) {
    const line = `• <@${player}>\n`;
    if ((current + line).length > 1_024) {
      chunks.push(current);
      current = line;
    } else {
      current += line;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

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
    const rosterEmbed = leagueEmbed(`⚽ ${team.name} Roster`, [
      "**📊 Roster Count**",
      `${team.players.length} / ${team.rosterLimit} registered player${team.players.length === 1 ? "" : "s"}`,
      "",
      "━━━━━━━━━━ Players ━━━━━━━━━━",
    ].join("\n"))
      .setThumbnail(team.logoUrl ?? null)
      .addFields(
        { name: "👑 Manager", value: team.manager ? `<@${team.manager.discordId}>` : "*Unassigned*", inline: true },
        { name: "🧠 Assistant Manager", value: team.assistantManager ? `<@${team.assistantManager.discordId}>` : "*Unassigned*", inline: true },
      );
    const playerChunks = splitRoster(players.map((player) => player.discordId));
    if (playerChunks.length === 0) {
      rosterEmbed.addFields({ name: "🥅 Players", value: "*No players registered yet.*" });
    } else {
      playerChunks.forEach((chunk, index) => {
        rosterEmbed.addFields({ name: index === 0 ? "🥅 Players" : "🥅 Players (continued)", value: chunk });
      });
    }
    await interaction.reply({ embeds: [rosterEmbed] });
  },
};

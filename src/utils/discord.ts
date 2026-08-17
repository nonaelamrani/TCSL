import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { env } from "../config/env.js";

const LEAGUE_RED = 0xc0392b;

export async function replyError(interaction: ChatInputCommandInteraction, message: string) {
  const payload = { content: `❌ ${message}`, ephemeral: true };
  if (interaction.deferred || interaction.replied) return interaction.followUp(payload);
  return interaction.reply(payload);
}

export function leagueEmbed(title: string, description?: string) {
  return new EmbedBuilder()
    .setColor(LEAGUE_RED)
    .setAuthor({ name: `${env.LEAGUE_NAME} — ${env.LEAGUE_SEASON}` })
    .setTitle(title)
    .setDescription(description ?? null)
    .setFooter({ text: `${env.LEAGUE_NAME} • League Management` })
    .setTimestamp();
}

export function successEmbed(title: string, description: string) {
  return leagueEmbed(`✅ ${title}`, description);
}

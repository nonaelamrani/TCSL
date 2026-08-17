import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";

export async function replyError(interaction: ChatInputCommandInteraction, message: string) {
  const payload = { content: `❌ ${message}`, ephemeral: true };
  if (interaction.deferred || interaction.replied) return interaction.followUp(payload);
  return interaction.reply(payload);
}

export function successEmbed(title: string, description: string) {
  return new EmbedBuilder().setColor(0x2ecc71).setTitle(title).setDescription(description).setTimestamp();
}

import { Client, Events, GatewayIntentBits } from "discord.js";
import { commandByName } from "./commands/index.js";
import { env } from "./config/env.js";
import { prisma } from "./database/prisma.js";
import { logger } from "./utils/logger.js";
import { replyError } from "./utils/discord.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (readyClient) => {
  logger.info(`Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isAutocomplete()) {
      if (!["team", "roster"].includes(interaction.commandName)) return;
      const focused = interaction.options.getFocused().toLowerCase();
      const teams = await prisma.team.findMany({
        where: { isArchived: false, name: { contains: focused, mode: "insensitive" } },
        orderBy: { name: "asc" }, take: 25, select: { name: true },
      });
      await interaction.respond(teams.map((team) => ({ name: team.name, value: team.name })));
      return;
    }
    if (!interaction.isChatInputCommand()) return;
    const command = commandByName.get(interaction.commandName);
    if (!command) return;
    await command.execute(interaction);
  } catch (error) {
    logger.error("Interaction failed", error);
    if (interaction.isChatInputCommand()) {
      await replyError(interaction, "Something went wrong. The issue has been logged.");
    }
  }
});

async function shutdown(signal: string) {
  logger.info(`${signal} received; shutting down.`);
  client.destroy();
  await prisma.$disconnect();
  process.exit(0);
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

await client.login(env.DISCORD_TOKEN);

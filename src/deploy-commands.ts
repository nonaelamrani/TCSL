import { REST, Routes } from "discord.js";
import { commands } from "./commands/index.js";
import { env } from "./config/env.js";

const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);
const body = commands.map((command) => command.data.toJSON());
const route = env.DISCORD_GUILD_ID
  ? Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID)
  : Routes.applicationCommands(env.DISCORD_CLIENT_ID);

await rest.put(route, { body });
console.log(`Registered ${body.length} slash command(s) ${env.DISCORD_GUILD_ID ? "for the development guild" : "globally"}.`);

import type { Command } from "./types.js";
import { rosterCommand } from "./roster.js";
import { teamCommand } from "./team.js";

export const commands: Command[] = [teamCommand, rosterCommand];
export const commandByName = new Map(commands.map((command) => [command.data.name, command]));

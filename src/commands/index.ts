import type { Command } from "./types.js";
import { rosterCommand } from "./roster.js";
import { teamCommand } from "./team.js";
import { assistantCommand, assignCommand, managerCommand, sackCommand } from "./management.js";

export const commands: Command[] = [teamCommand, rosterCommand, managerCommand, assistantCommand, assignCommand, sackCommand];
export const commandByName = new Map(commands.map((command) => [command.data.name, command]));

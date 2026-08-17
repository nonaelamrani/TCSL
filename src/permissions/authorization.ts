import type { GuildMember } from "discord.js";
import { prisma } from "../database/prisma.js";

export async function getConfiguration() {
  return prisma.configuration.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });
}

export async function isAdmin(member: GuildMember) {
  const config = await getConfiguration();
  return Boolean(config.adminRoleId && member.roles.cache.has(config.adminRoleId));
}

export async function canManageTeam(member: GuildMember, teamId: string) {
  if (await isAdmin(member)) return true;
  const team = await prisma.team.findFirst({
    where: { id: teamId, isArchived: false },
    select: { managerId: true, assistantManagerId: true },
  });
  return team?.managerId === member.id || team?.assistantManagerId === member.id;
}

import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, "DISCORD_TOKEN is required"),
  DISCORD_CLIENT_ID: z.string().min(1, "DISCORD_CLIENT_ID is required"),
  DISCORD_GUILD_ID: z.string().min(1).optional(),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid PostgreSQL URL"),
});

export const env = envSchema.parse(process.env);

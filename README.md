# Discord Football League Management Bot

Discord-only league management bot built with Node.js, TypeScript, discord.js, Prisma, and PostgreSQL. Persistent league data is stored in PostgreSQL—never the host filesystem.

## Setup

1. Install Node.js 20 or later, then run `npm install`.
2. Copy `.env.example` to `.env` and enter your Discord application values and PostgreSQL `DATABASE_URL`.
3. Create the development database schema with `npm run prisma:migrate -- --name init`.
4. Register commands to a development server with `npm run register`.
5. Start the bot with `npm run dev`.

`DISCORD_GUILD_ID` is optional: set it while developing for immediate guild-command updates; omit it only when you are ready to register global commands.

## Included foundation

- PostgreSQL Prisma schema for teams, players, offers, transfers, demands, matches, postponements, cases, audit logs, and configuration.
- `/team create`, `/team info`, and `/roster`, with database-backed team data and autocomplete.
- Database-backed admin/team authorization helpers. Before team administration can begin, set `Configuration.adminRoleId` through a trusted database administration path.
- Safe environment-variable validation and central error handling.

## Production deployment

Build with `npm run build`, then apply only pending schema migrations with `npm run prisma:deploy`. Do **not** use `prisma migrate reset` in production. Never seed or recreate the production database during deployment.

## GitHub workflow

Source code is versioned with Git and pushed to GitHub. Secrets and local database files are excluded by `.gitignore`. Never commit `.env`, Discord tokens, database passwords, or production data.

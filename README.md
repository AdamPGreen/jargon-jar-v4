# Jargon Jar

Jargon Jar is a Slack app that acts like a virtual swear jar for corporate jargon. Teammates can use `/jargon` to fine each other fake money, add new jargon terms, and view dashboard leaderboards for the worst offenders.

## Stack

- Next.js 14 App Router on Vercel
- Slack OAuth install flow, slash commands, and interactive modals via `@slack/web-api`
- Postgres with Drizzle ORM for the virtual ledger
- Signed HTTP-only cookie sessions for the dashboard
- Vitest for core helper coverage

## Features

- Add the app to a Slack workspace
- Sign in to the dashboard with Slack identity
- Use `/jargon` to open a Slack modal and create a virtual charge
- Reuse existing jargon terms or add a custom term from the modal
- Track workspace totals, user totals, activity, and leaderboards

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create environment variables:

   ```bash
   cp .env.local.example .env.local
   ```

   Required values:

   ```bash
   DATABASE_URL=postgres://user:password@host:5432/jargon_jar
   APP_SESSION_SECRET=replace-with-a-long-random-string
   SLACK_CLIENT_ID=1234567890.1234567890
   NEXT_PUBLIC_SLACK_CLIENT_ID=1234567890.1234567890
   SLACK_CLIENT_SECRET=replace-with-slack-client-secret
   SLACK_SIGNING_SECRET=replace-with-slack-signing-secret
   ```

3. Run the database migration:

   ```bash
   npm run db:migrate
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

## Slack Configuration

Configure the Slack app with these URLs for your deployed or tunneled host:

- Add to Slack redirect: `/api/auth/slack/callback`
- Sign in redirect: `/api/auth/slack/signin/callback`
- Slash command request URL: `/api/slack/commands`
- Interactivity request URL: `/api/slack/interactions`

The app uses Slack request signing for slash commands and interactions, so `SLACK_SIGNING_SECRET` must match the Slack app configuration.

## Scripts

- `npm run dev` - Start local development
- `npm run build` - Build for production
- `npm run start` - Start a production build
- `npm run lint` - Run Next.js linting
- `npm test` - Run Vitest tests
- `npm run db:generate` - Generate Drizzle migrations from schema changes
- `npm run db:migrate` - Apply Drizzle migrations

## Project Structure

- `src/app` - Pages, layouts, and API routes
- `src/components` - Dashboard and UI components
- `src/hooks` - Client data hooks
- `src/lib/auth` - Signed dashboard sessions and route guards
- `src/lib/db` - Drizzle schema, connection, and query helpers
- `src/lib/slack` - Slack OAuth, API, and request verification helpers
- `src/lib/ledger` - Virtual ledger aggregation helpers
- `drizzle` - SQL migrations

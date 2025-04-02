# Jargon Jar

An anti-corporate, snarky Slack app that functions as a virtual "swear jar" for corporate jargon. Users can charge colleagues for using business buzzwords, track jargon usage, and view leaderboards of the worst offenders.

## Features

### Slack Integration
- OAuth integration with Slack workspaces
- `/charge` slash command for charging users for jargon
- Interactive modals for selecting users and jargon terms
- Support for adding new jargon terms directly from the charge modal

### Jargon Modal UX
The Slack modal for the `/charge` command features an improved user experience:

#### For Existing Jargon Terms:
- When a term is selected from the dropdown, the charge amount is automatically populated
- The description field displays the term definition
- Users can still modify the charge amount if needed

#### For New Jargon Terms:
- When a user enters a term that's not in the dropdown, they can add it directly
- Users provide a description and default charge amount for the new term
- Upon submission, the charge is created AND the new term is added to the jargon library

## Technical Implementation
- Next.js 14 with App Router for server-side rendering
- Supabase for database, authentication, and storage
- Slack API integration for slash commands and interactive elements
- Serverless functions deployed on Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase account and project
- A Slack workspace with admin access

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/jargon-jar-v4.git
   cd jargon-jar-v4
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.local.example .env.local
   ```
   Then edit `.env.local` with your Supabase and Slack credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
   SLACK_CLIENT_ID=<your-slack-client-id>
   SLACK_CLIENT_SECRET=<your-slack-client-secret>
   SLACK_SIGNING_SECRET=<your-slack-signing-secret>
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Deployment
The application is automatically deployed to Vercel on commits to the main branch.

## Project Structure

- `/src/app` - Next.js app router pages and layouts
- `/src/components` - React components
- `/src/lib` - Utility functions and configurations
- `/src/types` - TypeScript type definitions

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

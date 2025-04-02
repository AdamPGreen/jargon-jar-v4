# Jargon Jar

An anti-corporate, snarky Slack app that functions as a virtual "swear jar" for corporate jargon. Users can charge colleagues for using business buzzwords, track jargon usage, and view leaderboards of the worst offenders.

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
   Then edit `.env.local` with your Supabase and Slack credentials.

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

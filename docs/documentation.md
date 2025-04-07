# Jargon Jar - Project Requirements

## Overview
Jargon Jar is an anti-corporate, snarky Slack app that functions as a virtual "swear jar" for corporate jargon. Users can charge colleagues for using business buzzwords, track jargon usage, and view leaderboards of the worst offenders.

## Core Features (MVP)

### Slack Integration
- OAuth integration with Slack workspaces
- Automatic jargon detection in channels where the app is invited
- `/charge` command to manually charge users for jargon usage
- Interactive modals for charging users and adding new jargon terms

### User Management
- Slack-based authentication system
- User profiles linked to Slack identities
- Tracking of individual jargon usage and charges

### Jargon Dictionary
- Pre-populated list of common corporate jargon with default costs
- Ability for users to add new jargon terms
- Customizable cost per jargon term

### Charging System
- Manual charging via `/charge` command
- Modal interface for selecting users, choosing jargon, and setting costs
- Automatic charging based on jargon detection in messages

### Web Dashboard
- Slack authentication for web access
- Personal statistics dashboard
- Workspace leaderboards/"Hall of Shame"
- Jargon analytics (most used terms, trending jargon, etc.)
- Personal jar total and history

## Technical Requirements

### Backend
- Supabase for database and authentication
- Slack API integration
- Serverless functions for processing charges and notifications

### Frontend
- Next.js framework
- Tailwind CSS for styling
- Shadcn UI component library
- Responsive design for mobile and desktop

### Deployment
- Vercel for hosting and deployment
- CI/CD pipeline for continuous deployment

## Brand Identity
- Anti-corporate, snarky tone
- Edgy, punk rock aesthetic
- Irreverent copy and messaging
- Bold visual design that stands out from corporate apps

## Future Enhancements (Post-MVP)
- Payment/donation system for actual charitable contributions
- Exportable reports for teams
- Advanced analytics

## Success Metrics
- User adoption rate within workspaces
- Active usage statistics
- Number of jargon terms added by community
- Engagement with the web dashboard
- User feedback and satisfaction


#Technology Documentation References

This document compiles essential documentation links for building the Jargon Jar application.

## Core Technologies

### Next.js
- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Next.js Dynamic Routes](https://nextjs.org/docs/routing/dynamic-routes)
- [Data Fetching in Next.js](https://nextjs.org/docs/basic-features/data-fetching)
- [Next.js Authentication](https://nextjs.org/docs/authentication)

### Supabase
- [Supabase Documentation](https://supabase.io/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Functions](https://supabase.com/docs/guides/functions)
- [Supabase Database Functions](https://supabase.com/docs/guides/database/functions)

### Tailwind CSS
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Tailwind Configuration](https://tailwindcss.com/docs/configuration)
- [Tailwind Directives](https://tailwindcss.com/docs/functions-and-directives)
- [Tailwind Dark Mode](https://tailwindcss.com/docs/dark-mode)
- [Tailwind Responsive Design](https://tailwindcss.com/docs/responsive-design)

### Shadcn UI
- [Shadcn UI Documentation](https://ui.shadcn.com/docs)
- [Shadcn UI Components](https://ui.shadcn.com/docs/components)
- [Shadcn UI Installation](https://ui.shadcn.com/docs/installation)
- [Shadcn UI Theming](https://ui.shadcn.com/docs/theming)
- [Shadcn UI Typography](https://ui.shadcn.com/docs/components/typography)

## Slack Integration

### Slack API
- [Slack API Documentation](https://api.slack.com/docs)
- [Slack App Manifest](https://api.slack.com/reference/manifests)
- [Slack Events API](https://api.slack.com/events-api)
- [Slack Web API](https://api.slack.com/web)
- [Slack Bolt for JavaScript](https://slack.dev/bolt-js/concepts)

### Authentication & OAuth
- [Slack OAuth Documentation](https://api.slack.com/authentication/oauth-v2)
- [Slack API Token Types](https://api.slack.com/authentication/token-types)
- [Slack Scopes](https://api.slack.com/scopes)
- [Add to Slack Button](https://api.slack.com/docs/slack-button)

### Slack Features
- [Slack Interactive Components](https://api.slack.com/interactivity)
- [Slack Block Kit](https://api.slack.com/block-kit)
- [Slack Message Guidelines](https://api.slack.com/best-practices/message-guidelines)
- [Slack Slash Commands](https://api.slack.com/interactivity/slash-commands)
- [Slack Modals](https://api.slack.com/surfaces/modals)
- [Slack Events](https://api.slack.com/events)

### Slack Security
- [Slack Request Verification](https://api.slack.com/authentication/verifying-requests-from-slack)
- [Slack Security Best Practices](https://api.slack.com/authentication/best-practices)
- [Handling Rate Limits](https://api.slack.com/docs/rate-limits)

## Deployment & DevOps

### Vercel
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel CLI](https://vercel.com/docs/cli)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [Vercel Serverless Functions](https://vercel.com/docs/serverless-functions/introduction)
- [Vercel Edge Functions](https://vercel.com/docs/concepts/functions/edge-functions)

### Current Deployment
- Production URL: https://jargon-jar-v4.vercel.app
- Environment Variables:
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
  - SLACK_CLIENT_ID
  - SLACK_CLIENT_SECRET
  - SLACK_SIGNING_SECRET

### Build Configuration
- Next.js 14 with App Router
- Tailwind CSS with custom theme
- Node.js runtime for server components
- Edge runtime for API routes

### GitHub
- [GitHub Actions](https://docs.github.com/en/actions)
- [GitHub Workflow Syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- [GitHub Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

### Security
- [OWASP Top Ten](https://owasp.org/www-project-top-ten/)
- [JWT Implementation](https://jwt.io/introduction)
- [API Security Best Practices](https://github.com/shieldfy/API-Security-Checklist)
- [Rate Limiting Strategies](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)

## Development Tools & Libraries

### Data Handling
- [React Query](https://tanstack.com/query/latest)
- [SWR Documentation](https://swr.vercel.app/)
- [Zod Validation](https://zod.dev/)
- [React Hook Form](https://react-hook-form.com/get-started)

### UI/UX
- [React Icons](https://react-icons.github.io/react-icons/)
- [Framer Motion](https://www.framer.com/motion/)
- [Recharts](https://recharts.org/en-US/)
- [Headless UI](https://headlessui.dev/)

### Testing
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Cypress](https://docs.cypress.io/guides/overview/why-cypress)
- [Playwright](https://playwright.dev/docs/intro)

## Additional Resources

### Design Inspiration
- [Punk UI Styles](https://www.awwwards.com/websites/punk/)
- [Anti-Corporate Design Patterns](https://www.smashingmagazine.com/2022/01/designing-anti-establishment-brands/)
- [Brutalist Web Design](https://brutalist-web.design/)
- [DIY Aesthetic Resources](https://www.behance.net/gallery/154613047/DIY-Aesthetic-Branding-Guide)

### Accessibility
- [Web Content Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/standards-guidelines/wcag/)
- [Accessible Rich Internet Applications (ARIA)](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA)
- [Inclusive Components](https://inclusive-components.design/)

### Performance
- [Web Vitals](https://web.dev/vitals/)
- [Next.js Performance Optimization](https://nextjs.org/docs/advanced-features/measuring-performance)
- [React Performance Optimization](https://reactjs.org/docs/optimizing-performance.html)

### API Design
- [REST API Best Practices](https://stackoverflow.blog/2020/03/02/best-practices-for-rest-api-design/)
- [API Design Guide](https://cloud.google.com/apis/design)
- [GraphQL Documentation](https://graphql.org/learn/)

### Database Design
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Database Normalization](https://www.guru99.com/database-normalization.html)
- [SQL Performance Tips](https://use-the-index-luke.com/)

## Database Schema (Supabase)

### Tables

#### users
- `id` (UUID, PK) - Unique identifier
- `slack_id` (text) - Slack user ID
- `email` (text) - User email from Slack
- `display_name` (text) - User display name
- `avatar_url` (text) - Profile picture URL
- `workspace_id` (UUID, FK to workspaces) - Associated Slack workspace
- `created_at` (timestamptz) - Account creation time
- `updated_at` (timestamptz) - Last update time

#### workspaces
- `id` (UUID, PK) - Unique identifier
- `slack_id` (text) - Slack workspace ID
- `name` (text) - Workspace name
- `domain` (text) - Slack workspace domain
- `token` (text, encrypted) - OAuth access token
- `bot_token` (text, encrypted) - Bot user OAuth token
- `created_at` (timestamptz) - Workspace addition time
- `updated_at` (timestamptz) - Last update time

#### jargon_terms
- `id` (UUID, PK) - Unique identifier
- `term` (text) - The jargon word/phrase
- `description` (text) - Brief explanation of the term
- `default_cost` (numeric) - Default charging amount
- `created_by` (UUID, FK to users) - User who added the term
- `workspace_id` (UUID, FK to workspaces) - Workspace-specific terms
- `created_at` (timestamptz) - Term addition time
- `updated_at` (timestamptz) - Last update time

#### charges
- `id` (UUID, PK) - Unique identifier
- `charged_user_id` (UUID, FK to users) - User being charged
- `charging_user_id` (UUID, FK to users) - User imposing the charge
- `jargon_term_id` (UUID, FK to jargon_terms) - Associated jargon
- `amount` (numeric) - Charge amount
- `message_text` (text) - Original message containing jargon
- `message_ts` (text) - Slack message timestamp
- `channel_id` (text) - Slack channel ID
- `is_automatic` (bool) - Whether the charge was automatic
- `workspace_id` (UUID, FK to workspaces) - Associated workspace
- `created_at` (timestamptz) - Charge time

#### channels
- `id` (UUID, PK) - Unique identifier
- `slack_id` (text) - Slack channel ID
- `name` (text) - Channel name
- `workspace_id` (UUID, FK to workspaces) - Associated workspace
- `is_monitoring` (bool) - Whether auto-detection is enabled
- `created_at` (timestamptz) - Channel addition time
- `updated_at` (timestamptz) - Last update time

### Views

#### user_favorite_jargon
A view that tracks users' most used jargon terms.
- `charged_user_id` (uuid) - The user who used the jargon
- `favorite_phrase` (text) - The jargon term/phrase
- `term_count` (bigint, int8) - Number of times the user has used this term

#### user_jargon_counts
A view that provides aggregate counts of jargon usage per user.
- `charged_user_id` (uuid) - The user who used the jargon
- `jargon_count` (bigint, int8) - Total count of jargon terms used by the user

## API Endpoints

### Authentication
- `POST /api/auth/slack/callback` - Slack OAuth callback
- `GET /api/auth/session` - Get current session
- `POST /api/auth/logout` - Log out

### Workspaces
- `GET /api/workspaces` - List user's workspaces
- `GET /api/workspaces/:id` - Get workspace details

### Jargon Terms
- `GET /api/jargon` - List jargon terms
- `POST /api/jargon` - Add new jargon term
- `PUT /api/jargon/:id` - Update jargon term
- `DELETE /api/jargon/:id` - Delete jargon term

### Charges
- `POST /api/charges` - Create a new charge
- `GET /api/charges` - List charges (filterable)
- `GET /api/charges/stats` - Get charging statistics

### Data Structures

### Users
- `GET /api/users/me` - Get current user
- `GET /api/users/:id` - Get user details
- `GET /api/users/leaderboard` - Get jargon usage leaderboard

## Database Functions

### get_my_workspace_id()
Returns the workspace_id for the currently authenticated user.

```sql
CREATE OR REPLACE FUNCTION get_my_workspace_id()
RETURNS UUID
LANGUAGE sql
SECURITY definer
AS $$
  SELECT workspace_id
  FROM users
  WHERE id = auth.uid();
$$;
```

### get_top_users_by_amount(workspace_id_param UUID, time_period text, limit_param integer)
Returns leaderboard data for users based on their jargon charges within a specified time period.

Parameters:
- `workspace_id_param` (UUID) - The workspace to get results for
- `time_period` (text) - Either 'week', 'month', or null for all time
- `limit_param` (integer) - Maximum number of users to return

Returns:
- `user_id` (UUID) - User's unique identifier
- `name` (text) - User's display name
- `image_url` (text) - User's avatar URL
- `total_amount` (numeric) - Total amount charged
- `charge_count` (integer) - Number of charges

```sql
CREATE OR REPLACE FUNCTION get_top_users_by_amount(
  workspace_id_param UUID,
  time_period text,
  limit_param integer
)
RETURNS TABLE (
  user_id UUID,
  name text,
  image_url text,
  total_amount numeric,
  charge_count bigint
)
LANGUAGE plpgsql
SECURITY definer
AS $$
DECLARE
  start_date TIMESTAMP;
BEGIN
  -- Set the start date based on time_period
  IF time_period = 'week' THEN
    start_date := NOW() - INTERVAL '1 week';
  ELSIF time_period = 'month' THEN
    start_date := NOW() - INTERVAL '1 month';
  ELSE
    start_date := NULL; -- All time
  END IF;

  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.display_name as name,
    u.avatar_url as image_url,
    COALESCE(SUM(c.amount), 0) as total_amount,
    COUNT(c.id) as charge_count
  FROM 
    users u
  LEFT JOIN 
    charges c ON u.id = c.charged_user_id
  WHERE
    u.workspace_id = workspace_id_param
    AND (start_date IS NULL OR c.created_at >= start_date)
    AND (c.workspace_id = workspace_id_param OR c.id IS NULL)
  GROUP BY 
    u.id, u.display_name, u.avatar_url
  ORDER BY 
    total_amount DESC
  LIMIT 
    limit_param;
END;
$$;
```

### update_updated_at_column()
Trigger function to automatically update the updated_at timestamp when a row is modified.

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;
```

Usage example for update_updated_at_column:
```sql
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

-- Users: Users can only see users in their workspace
CREATE POLICY "Users can view users in their workspace"
    ON users FOR SELECT
    USING (workspace_id = get_my_workspace_id());

-- Jargon Terms: Users can view all terms in their workspace

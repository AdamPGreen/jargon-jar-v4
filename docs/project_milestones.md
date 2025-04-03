# Jargon Jar - Development Sequence

## Phase 1: Foundation & Setup (Week 1-2)

### Development Environment
- [x] Set up GitHub repository
- [x] Configure Vercel project
- [x] Set up Supabase project
- [x] Configure development environment
- [ ] Set up CI/CD pipeline

### Project Scaffolding
- [x] Initialize Next.js project
- [x] Set up Tailwind CSS and Shadcn UI
- [x] Create basic project structure
- [ ] Implement responsive layouts
- [ ] Set up routing and navigation

### Authentication System
- [x] Configure Slack OAuth in Supabase
- [x] Set up authentication routes
- [x] Implement login/logout functionality
- [ ] Create protected routes
- [x] Set up user session management

## Phase 2: Core Backend (Week 3-4)

### Database Setup
- [x] Create database schema
- [x] Set up migrations
- [x] Initialize seed data with common jargon terms
- [x] Configure database access policies (RLS)
- [x] Set up database triggers for analytics (updated_at)

### Slack App Configuration
- [x] Register Slack app
- [x] Configure OAuth scopes
- [ ] Set up slash commands
- [ ] Configure event subscriptions
- [ ] Set up interactive components

### API Development
- [ ] Implement user endpoints
- [ ] Create jargon term endpoints
- [ ] Develop charge endpoints
- [ ] Build statistics endpoints
- [ ] Implement webhooks for Slack events

## Phase 3: Slack Integration (Week 5-6)

### Slash Command Handling
- [x] Implement `/charge` command
- [x] Build charge modal UI
- [x] Create jargon selection interface
- [x] Implement user selection
- [x] Add charge confirmation
- [x] Implement unified `/jargon` command structure
- [x] Add subcommands (`charge`, `new`, `help`)
- [x] Update Slack app configuration

### Jargon Detection
- [ ] Create message monitoring system
- [ ] Implement jargon detection algorithm
- [ ] Set up automatic charge creation
- [ ] Add notification system
- [ ] Implement channel monitoring settings

### Interactive Components
- [x] Build modal interaction handlers
- [x] Create jargon term addition flow
- [ ] Implement charge confirmation flow
- [ ] Set up message action buttons
- [ ] Add help command responses

## Phase 4: Web Dashboard (Week 7-8)

### Dashboard Foundation
- [ ] Refine Web App Authentication Flow
  - [ ] Handle distinct sign-in vs. installation scenarios
  - [ ] Update `/auth/callback` logic if needed
- [ ] Implement Protected Routes for `/dashboard/*`
  - [ ] Set up Next.js middleware for authentication checks
  - [ ] Create dedicated sign-in page (`/sign-in`)
- [ ] Create Basic Dashboard Layout (`app/dashboard/layout.tsx`)
  - [ ] Implement responsive sidebar navigation
  - [ ] Set up main content area grid/structure
  - [ ] Apply basic brand styling placeholders

### Dashboard Components & Data Integration
- [ ] Create Main Dashboard Page (`/dashboard`)
- [ ] Develop Placeholder Components for core sections
- [ ] Verify/Create Necessary API Endpoints (Users, Charges, Stats)
- [ ] Build Personal Statistics Components
  - [ ] Fetch and display user-specific data
- [ ] Implement Charge History View
  - [ ] Fetch and display charge data with filtering/pagination
- [ ] Create Jargon Usage Charts
  - [ ] Fetch aggregated data and visualize using a chart library
- [ ] Add Quick Actions Section
  - [ ] Implement simple forms/buttons for key actions

### Leaderboard & Analytics (Part of Dashboard)
- [ ] Implement Leaderboard UI
- [ ] Create Analytics Visualizations (beyond basic charts)
- [ ] Build Jargon Popularity Metrics
- [ ] Add Time-Based Trend Analysis
- [ ] Implement Filtering Options

### Jargon Management (Web Interface)
- [ ] Create Jargon Browser Interface
- [ ] Implement Jargon Addition Form
- [ ] Build Jargon Editing Functionality
- [ ] Add Search and Filtering
- [ ] Implement Cost Management (if applicable via web)

### Refinement
- [ ] Apply Final Brand Styling & Theme
- [ ] Ensure Responsiveness Across Devices
- [ ] Implement Loading States and Error Handling

## Phase 5: Testing & Refinement (Week 9-10)

### Testing
- [ ] Write unit tests
- [ ] Implement integration tests
- [ ] Conduct end-to-end testing
- [ ] Perform security testing
- [ ] Test Slack integration thoroughly

### Performance Optimization
- [ ] Optimize database queries
- [ ] Implement caching where appropriate
- [ ] Optimize frontend performance
- [ ] Improve API response times
- [ ] Optimize image assets

### UI/UX Refinement
- [ ] Gather initial user feedback
- [ ] Refine interface based on feedback
- [ ] Improve responsive design
- [ ] Enhance accessibility
- [ ] Polish animations and transitions

## Phase 6: Launch Preparation (Week 11-12)

### Documentation
- [ ] Create user documentation
- [ ] Write API documentation
- [ ] Prepare installation guides
- [ ] Create marketing materials
- [ ] Finalize code documentation

### Final Testing
- [ ] Conduct user acceptance testing
- [ ] Perform cross-browser testing
- [ ] Test on various devices
- [ ] Check all edge cases
- [ ] Validate against requirements

### Deployment
- [ ] Set up production environment
- [ ] Configure monitoring and logging
- [ ] Implement error tracking
- [ ] Perform security hardening
- [ ] Deploy to production

## Post-Launch (Ongoing)

### Monitoring & Maintenance
- [ ] Monitor system performance
- [ ] Track error rates
- [ ] Implement user feedback loop
- [ ] Regular security updates
- [ ] Database maintenance

### Feature Expansion
- [ ] Gather usage data for insights
- [ ] Prioritize feature requests
- [ ] Plan subsequent releases
- [ ] Expand jargon dictionary
- [ ] Consider platform expansions

### Community Building
- [ ] Create user engagement strategy
- [ ] Establish feedback channels
- [ ] Build community around the tool
- [ ] Share success stories
- [ ] Plan marketing initiatives


# Jargon Jar - Development Progress

## Authentication Implementation (Week 1)

### Completed
- Set up Supabase project and configured environment variables
- Implemented Slack OIDC authentication flow:
  - Created Supabase client utilities (`src/lib/supabase/client.ts`, `server.ts`, `middleware.ts`)
  - Implemented Next.js middleware for session handling
  - Created sign-in page with Slack authentication button
  - Implemented OAuth callback route handler
  - Successfully tested authentication flow in development environment

### Technical Details
- Using `@supabase/ssr` for Next.js 14 server/client components
- Slack OIDC provider configured with required scopes (`openid`, `email`, `profile`)
- Authentication flow:
  1. User clicks "Sign in with Slack" button
  2. Redirected to Slack for authorization
  3. Callback handled at `/auth/callback`
  4. Session established via Supabase
  5. User redirected to homepage

### Next Steps
- Implement database schema for jargon terms and charges
- Set up user profiles and workspace associations
- Add sign-out functionality
- Implement protected routes

## Database Setup (Week 2)

### Completed
- Created initial database schema based on `docs/schema.md`
  - Tables: `workspaces`, `users`, `jargon_terms`, `channels`, `charges`
  - Enabled `uuid-ossp` extension
  - Established foreign key relationships with `ON DELETE CASCADE`
  - Added indexes for common query patterns
  - Implemented `updated_at` triggers on all relevant tables
- Created migration files in `supabase/migrations`:
  - `20240331000000_initial_schema.sql`
  - `20240331000001_seed_jargon.sql`
- Seeded `jargon_terms` table with default global terms from `docs/jargon-dictionary.md`
- Configured Row Level Security (RLS) policies for basic workspace-based access control
- Applied migrations manually via Supabase SQL Editor

### Technical Details
- Modified `jargon_terms.created_by` to be nullable to allow seeding global terms without a specific user creator.
- RLS Policies restrict SELECT operations on core tables to users within the same workspace based on `auth.jwt()->>'sub'` matching `users.slack_id` and associated `workspace_id`.

### Next Steps
- Configure Slack App for slash commands and events
- Implement API endpoints (starting with users and jargon terms)
- Refine RLS policies as application logic evolves
- Add sign-out functionality and protected routes to the web app

## Deployment Progress (Week 1)

### Completed
- Set up Vercel project and configured environment variables:
  - Added Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
  - Added Slack environment variables (SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, SLACK_SIGNING_SECRET)
  - Successfully deployed to Vercel with environment configuration
  - Fixed Tailwind CSS configuration issues
  - Successfully deployed to production at jargon-jar-v4.vercel.app

### Next Task
- Set up basic Slack slash command `/charge`:
  1. Configure slash command in Slack App settings to point to production URL
  2. Test command in development environment
  3. Implement basic command handler endpoint

### Next Session Prompt
"Now that we have our app deployed to production, let's configure the `/charge` slash command in the Slack App settings. We need to point it to our production URL and test the basic functionality. Can you help me with that?"

## Slack Integration Progress (Week 5)

### Completed
- Successfully configured Slack App settings:
  - Set up OAuth scopes for bot token
  - Configured slash command `/charge` endpoint
  - Enabled interactive components
  - Set up proper environment variables
- Implemented slash command handler:
  - Created `/api/slack/commands/route.ts`
  - Added request verification
  - Implemented modal opening functionality
- Created interactions handler:
  - Set up `/api/slack/interactions/route.ts`
  - Added basic modal submission handling
  - Implemented request verification
- Enhanced Slack modal UX:
  - Implemented dynamic field updates based on jargon selection
  - Added "Add New Jargon" button with plus sign emoji
  - Optimized metadata size to stay within Slack's limits
  - Fixed type errors and linter issues
  - Added debug logging for troubleshooting
- Improved Slack modal interactivity:
  - Added dynamic jargon description display when term is selected
  - Implemented pre-populated charge amount based on jargon term default cost
  - Used views.update API to dynamically update the modal
  - Preserved user selections during modal updates
  - Fixed interaction flow for better user experience

### Technical Details
- Using Slack's Block Kit for modal UI
- Implemented proper request verification using Slack's signing secret
- Added diagnostic logging for debugging
- Configured proper CORS headers in `next.config.js`
- Optimized modal metadata to stay under Slack's 3001 character limit
- Fixed button styling issues in modal views
- Implemented dispatch_action to trigger immediate updates on selection changes

### Next Steps
- Complete the charge creation logic in the database after form submission
- Create comprehensive error handling for the charge creation process
- Add confirmation messages in the Slack channel
- Implement analytics tracking for charges
- Add support for charge history and reporting

### Next Session Prompt
"Now that we have the Slack modal interactions working correctly with dynamic updates, let's implement automated jargon detection in channels. We need to:
1. Set up Slack event subscriptions for message events
2. Create a handler to process incoming messages
3. Implement jargon detection logic
4. Add automatic charge creation for detected jargon
5. Send notification messages to the channel

Can you help me implement this feature?"

## Debugging OAuth & Commands (Week 5 Cont.)

### Completed
- **Resolved Slack Installation Failures:**
  - Corrected OAuth flow to use direct Slack URL (`oauth/v2/authorize`) with separate `scope` (bot) and `user_scope` parameters.
  - Fixed callback handler (`/api/auth/slack/callback`) logic:
    - Implemented `oauth.v2.access` code exchange.
    - Added `team.info` fetch to get workspace domain.
    - Ensured `domain` and user `token` were included in `workspaces` upsert to satisfy `NOT NULL` constraints.
    - Used Supabase `service_role` key to bypass RLS policies during initial `workspaces` and `users` record creation.
- **Resolved `/charge` Command Failures (`dispatch_failed`, `PGRST116`):
  - Corrected command handler (`/api/slack/commands`) to use the workspace-specific `bot_token` fetched from the database for `views.open` calls.
  - Updated command handler to use Supabase `service_role` key for database reads (user, workspace, jargon terms), bypassing RLS read restrictions encountered by the backend function.
  - Confirmed `/charge` command successfully fetches data and opens the modal with user and jargon selection.

### Next Steps
- Implement charge creation logic in the interactions handler (`/api/slack/interactions`).
- Add confirmation message posting to Slack channel after charge creation.

## Implementing Modal Interactions (Week 6)

### Completed
- **Fixed Modal JSON Display Issue:**
  - Identified and fixed issue where the modal JSON payload was being displayed in the Slack channel
  - Modified the command handler to return an empty 200 OK response after initiating the `views.open` API call
  - Ensured clean user experience with no technical details leaking to users
- **Implemented "Add New Jargon" Button Functionality:**
  - Added handler for the `add_new_jargon` action in the `handleBlockActions` function
  - Created a new modal for adding jargon terms with fields for term, description, and default cost
  - Used `views.push` API to display this modal on top of the existing charge modal
  - Implemented submission handler in `handleModalSubmission` to process `add_jargon_modal` form data
  - Added validation for required fields and appropriate error messages
  - Implemented database operations to save new jargon terms to the workspace's collection
  - Added confirmation messages posted to the channel when a new term is added
  - Fixed TypeScript type issues with proper type assertions for Slack API objects
- **Completed Charge Creation Flow:**
  - Implemented full end-to-end workflow from slash command to charge confirmation
  - Added proper error handling and validation throughout the process
  - Optimized database operations with appropriate error handling

### Technical Details
- Utilized Slack's `views.push` API for stacking modals
- Implemented proper metadata passing between modal views
- Used type assertions (`as const`) to satisfy TypeScript's strict type requirements for Slack API objects
- Optimized error handling with specific error messages for different failure cases
- Added comprehensive logging for debugging and monitoring

### Next Steps
- Implement unified `/jargon` command structure with subcommands
- Create handlers for different subcommands like `/jargon charge`, `/jargon add-term`, and `/jargon help`
- Update Slack app configuration for the new command structure
- Implement automated jargon detection in channels

### Next Session Prompt
"Let's implement a unified slash command structure for Jargon Jar. We need to:

1. Create a new `/jargon` command handler that can parse and route subcommands
2. Move the existing `/charge` functionality to work as `/jargon charge`
3. Implement direct term adding with `/jargon add-term`  
4. Add a `/jargon help` command that displays available options
5. Update our Slack app configuration to use the new command structure

This will require modifying the existing command handler, creating helper functions for the different subcommands, and updating the Slack app settings. Can you help me implement this new command structure?"

# Jargon Jar MVP — Project Requirements

Jargon Jar is a Slack-integrated virtual "swear jar" for workplace jargon. Users charge each other for using buzzwords like "synergy" or "leverage" using a slash command or auto-detection, and can track individual and workspace stats through a minimal web dashboard.

---

## Goals

- Enable Slack users to charge others for jargon usage
- Let anyone in the workspace manage the list of banned jargon words
- Provide a simple web dashboard for stats
- Keep the architecture clean and minimal for fast iteration

---

## Core User Stories

### As a Slack user:
- I can use the `/charge` command to fine a coworker for jargon.
- I can select a user, a word, and leave a comment via a Slack modal.
- I can add a new jargon word to the workspace list.
- I can view stats (mine and the workspace's) via a web app.

### As a member of a workspace:
- I can see the top offenders, most charged words, and total amount charged.
- I can view a public list of all words in the jar.

---

## Tech Stack

- **Frontend**: Next.js + Tailwind + ShadCN UI
- **Backend**: Supabase (Postgres + Auth + Edge Functions)
- **Slack App**: Slash commands, modals, event subscriptions
- **Deployment**: Vercel (frontend) + Supabase (backend)

---

## Data Schema (Simplified)

```sql
users (id, slack_user_id, name, workspace_id)
workspaces (id, slack_workspace_id, name)
charges (id, charged_user_id, charged_by_id, word, timestamp, workspace_id, comment)
jargon_words (id, word, added_by_user_id, workspace_id, created_at)
```

---

## MVP Feature Scope

### Slack Integration
- `/charge` slash command
- Modal:
  - Select user to charge
  - Select/add word (autocomplete from existing words)
  - Optional comment
- Event subscription for auto-detecting configured words (optional, MVP if time allows)

### Web App
- Slack OAuth login (workspace + user)
- Dashboard:
  - My stats (total charges received, top charged words)
  - Workspace stats (leaderboard, most charged words, total jar)
  - Jargon list: shows all active words, who added them, when
  - Add new jargon word form (open to all users)


---

## Development Plan

### 1. Slack App Setup
- Register Slack App and enable slash command `/charge`
- Enable Socket Mode or HTTPS for event listening
- Implement modal UI triggered by `/charge`

### 2. Supabase Setup
- Define schema: `users`, `workspaces`, `charges`, `jargon_words`
- Enable Slack OAuth with Supabase Auth
- Create RPC or edge function for storing charges and new words

### 3. Slack Backend Logic
- Handle `/charge` modal submission
  - Validate user + word
  - Allow word creation if not in list
  - Record charge in Supabase
- Optional: event-based listener to detect jargon words in real-time messages

### 4. Web App (Next.js)
- Slack login → fetch token → auth with Supabase
- Dashboard:
  - My stats view
  - Workspace leaderboard view
  - Public list of jargon words (with who added it)
  - Form to add new words (writes to Supabase)
- Use SWR or Supabase client to fetch real-time data

### 5. UI/UX
- Minimal clean UI (ShadCN + Tailwind)
- Fun visual elements (jar fill level, emoji reactions)
- Responsive mobile view for web dashboard

### 6. Deployment & Testing
- Deploy web app to Vercel
- Test Slack app in a real workspace (use development tokens)
- Validate charge flow, data persistence, and dashboard accuracy

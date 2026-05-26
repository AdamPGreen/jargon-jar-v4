# Slack Charge UX Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the Slack charge flow so it's a single coherent path that actually posts feedback to the channel, with the brutalist FINED receipt image embedded inline, no bots in the teammate picker, no redundant form fields, and the context phrase actually shown to the room.

**Architecture:** One slash command (`/jargon`) opens one modal. Submission writes the charge, then posts a Block Kit message that embeds the existing OG receipt image inline. Teammate picker and term picker both use `external_select` backed by `/api/slack/options`, so we can filter bots out of the user list and offer "create new term" inline. The fine amount is owned by the term (no per-charge override in the modal) — out-of-band amount tweaks happen on the dashboard. Notification failures fall back to an ephemeral that tells the charger to invite the bot to the channel.

**Tech Stack:** Next.js App Router (Node runtime), Slack Web API, Slack Block Kit, Drizzle ORM, Postgres (Neon), Vitest.

---

## Pre-work — Slack app configuration (Adam, in api.slack.com/apps)

These don't touch code. Do them before Task 2 ships, then revisit Pre-3 after Task 7 ships.

- [ ] **Pre-1: Add `/jargon` slash command**
  - Request URL: `https://<your-app-host>/api/slack/commands` (same endpoint as `/charge`)
  - Short description: `Charge someone for corporate jargon`
  - Usage hint: leave blank
  - Escape channels, users, and links: off

- [ ] **Pre-2: Set the global "Options Load URL"** under *Interactivity & Shortcuts → Select Menus*
  - URL: `https://<your-app-host>/api/slack/options`
  - This is what Slack hits when a user types into an `external_select`.

- [ ] **Pre-3: After Task 7 ships and is verified in a real workspace, delete the old `/charge` slash command.**
  - Don't delete it until the new path is proven, so we don't strand anyone mid-flow.

---

## Task 1: Diagnose and fix the silent "nothing posts" bug

**Why first:** every other UX change is unverifiable until we can see the channel feedback. The bot likely isn't in the channel the modal was opened from (e.g. #app-test that Adam just joined), and the existing code logs the error but swallows it.

**Files:**
- Modify: [src/app/api/slack/interactions/route.ts](../../../src/app/api/slack/interactions/route.ts) (the `handleChargeSubmission` function, lines 57–173)
- Modify: [src/lib/slack/notifications.ts](../../../src/lib/slack/notifications.ts) (add fallback helper)
- Modify: [src/lib/slack/notifications.test.ts](../../../src/lib/slack/notifications.test.ts) (cover fallback path)

- [ ] **Step 1: Reproduce the bug locally with a logged error**

Run the dev server, charge someone in a channel where the bot is *not* a member, and look at the Vercel/server logs. Expected: `Slack charge notification failed: not_in_channel`. Confirm this is the failure mode before changing code.

```bash
pnpm dev
# In Slack: invite the bot to #channel-A, /charge in #channel-B (no bot), submit modal
# Watch terminal for the console.error line
```

If the error is something else (e.g. `channel_not_found`, `missing_scope`), update the fallback logic in Step 3 accordingly.

- [ ] **Step 2: Write a failing test for the fallback behavior**

Add to [src/lib/slack/notifications.test.ts](../../../src/lib/slack/notifications.test.ts):

```typescript
it("falls back to an ephemeral charger message when the channel post fails with not_in_channel", async () => {
  const postMessage = vi.fn().mockRejectedValue(new Error("not_in_channel"))
  const postEphemeral = vi.fn().mockResolvedValue({ ok: true })

  const result = await postChargeNotificationWithFallback({
    postMessage,
    postEphemeral,
    channelId: "C123",
    threadTs: null,
    chargingSlackUserId: "U999",
    chargedSlackUserId: "U123",
    amount: "1",
    termName: "synergy",
    totalOwed: "1",
    leaderboardUrl: "https://x/lb",
    receiptUrl: "https://x/r/abc",
    receiptImageUrl: "https://x/r/abc/opengraph-image",
  })

  expect(result).toEqual({ ok: true, fallback: "ephemeral", reason: "not_in_channel" })
  expect(postEphemeral).toHaveBeenCalledWith(
    expect.objectContaining({
      channel: "C123",
      user: "U999",
      text: expect.stringContaining("invite"),
    })
  )
})
```

- [ ] **Step 3: Run the test to confirm it fails**

```bash
pnpm vitest src/lib/slack/notifications.test.ts -t "falls back to an ephemeral"
```

Expected: FAIL — `postChargeNotificationWithFallback is not defined`.

- [ ] **Step 4: Add the helper to notifications.ts**

Append to [src/lib/slack/notifications.ts](../../../src/lib/slack/notifications.ts):

```typescript
type ChargeNotificationWithFallbackInput = ChargeNotificationInput & {
  postEphemeral: PostEphemeral
  chargingSlackUserId: string
}

type FallbackResult =
  | { ok: true; fallback: null }
  | { ok: true; fallback: "ephemeral"; reason: string }
  | { ok: false; error: string }

export async function postChargeNotificationWithFallback(
  input: ChargeNotificationWithFallbackInput
): Promise<FallbackResult> {
  const primary = await postChargeNotification(input)
  if (primary.ok) return { ok: true, fallback: null }

  const reason = primary.error
  const ephemeralText =
    reason === "not_in_channel"
      ? `:warning: I couldn't post the receipt in this channel — please invite me with \`/invite @JargonJar\` and try again. (Your charge of $${Number(input.amount).toFixed(2)} for "${input.termName}" was saved.)`
      : `:warning: Couldn't post the receipt to the channel (\`${reason}\`). Your charge of $${Number(input.amount).toFixed(2)} for "${input.termName}" was saved. View it here: ${input.receiptUrl}`

  try {
    await input.postEphemeral({
      channel: input.channelId,
      user: input.chargingSlackUserId,
      thread_ts: input.threadTs ?? undefined,
      text: ephemeralText,
    })
    return { ok: true, fallback: "ephemeral", reason }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown Slack fallback error",
    }
  }
}
```

(The `receiptImageUrl` field on the input is added in Task 3. For now, accept it in the type but don't reference it in this helper. The compile won't break because Task 3 also adds the field on `ChargeNotificationInput`.)

If TypeScript complains in the meantime, add `receiptImageUrl: string` to `ChargeNotificationInput` now as a no-op field — Task 3 will use it.

- [ ] **Step 5: Run the test to verify it passes**

```bash
pnpm vitest src/lib/slack/notifications.test.ts
```

Expected: all green.

- [ ] **Step 6: Wire the fallback into the interactions route**

In [src/app/api/slack/interactions/route.ts](../../../src/app/api/slack/interactions/route.ts), replace the `Promise.all([postChargeNotification(...), postChargeConfirmation(...)])` block (lines 143–170) with:

```typescript
const notification = await postChargeNotificationWithFallback({
  postMessage: slack.chat.postMessage.bind(slack.chat),
  postEphemeral: slack.chat.postEphemeral.bind(slack.chat),
  channelId: metadata.channel_id!,
  threadTs: metadata.thread_ts,
  chargingSlackUserId,
  chargedSlackUserId: chargedSlackUserId!,
  amount: amount!,
  termName,
  totalOwed,
  leaderboardUrl: `${baseUrl}/dashboard/leaderboard`,
  receiptUrl: `${baseUrl}/receipt/${charge.id}`,
  receiptImageUrl: `${baseUrl}/receipt/${charge.id}/opengraph-image`,
})

if (!notification.ok) {
  console.error("Slack charge notification failed entirely:", notification.error)
} else if (notification.fallback === "ephemeral") {
  console.warn("Slack charge fell back to ephemeral:", notification.reason)
}

// Confirmation only fires when the public message succeeded (no need to double-notify on fallback).
if (notification.ok && notification.fallback === null) {
  const confirmation = await postChargeConfirmation({
    postEphemeral: slack.chat.postEphemeral.bind(slack.chat),
    channelId: metadata.channel_id!,
    threadTs: metadata.thread_ts,
    chargingSlackUserId,
    chargedSlackUserId: chargedSlackUserId!,
    amount: amount!,
    termName,
  })
  if (!confirmation.ok) {
    console.error("Slack charge confirmation failed:", confirmation.error)
  }
}
```

Also update the import at the top of the file:

```typescript
import {
  postChargeConfirmation,
  postChargeNotificationWithFallback,
} from "@/lib/slack/notifications"
```

(Drop the now-unused `postChargeNotification` import.)

- [ ] **Step 7: Manual verify in a real workspace**

1. Charge in a channel where the bot IS a member → channel message appears, ephemeral confirmation also appears.
2. Charge in a channel where the bot is NOT a member → ephemeral warning appears telling the charger to invite the bot. No public message.
3. Invite the bot, charge again → channel message appears.

- [ ] **Step 8: Commit**

```bash
git add src/lib/slack/notifications.ts src/lib/slack/notifications.test.ts src/app/api/slack/interactions/route.ts
git commit -m "fix(slack): surface channel-post failures via ephemeral fallback"
```

---

## Task 2: Rename `/charge` → `/jargon`, drop subcommands and optional phrase

**Why:** one slash command, one path. The optional phrase and `help` subcommand are dead weight once the modal is the only entry point. `/jargon` is the brand; `/charge` is fine but ambiguous in workspaces that have other charging tools.

**Files:**
- Modify: [src/app/api/slack/commands/route.ts](../../../src/app/api/slack/commands/route.ts)

- [ ] **Step 1: Strip subcommand parsing and phrase arg from the handler**

Replace lines 33–54 of [src/app/api/slack/commands/route.ts](../../../src/app/api/slack/commands/route.ts) with:

```typescript
const slack = new WebClient(workspace.installation.botToken)
const terms = await listJargonTerms(workspace.id)

await slack.views.open({
  trigger_id: triggerId,
  view: buildChargeModal({
    workspaceId: workspace.id,
    channelId,
    chargingSlackUserId: userId,
    threadTs,
    terms,
  }),
})

return new Response("", { status: 200 })
```

Also delete the now-unused `text` variable (line 14) and the `text.split(...)` and `subcommand === "help"` logic.

- [ ] **Step 2: Drop `initialPhrase` from `buildChargeModal`**

In the same file, remove `initialPhrase: string` from the `buildChargeModal` input type and remove the `initial_value: input.initialPhrase` line on the custom_term block. (The custom_term block gets removed entirely in Task 5 — for now just drop the initial_value.)

- [ ] **Step 3: Verify the endpoint accepts both `/jargon` and `/charge` (until Pre-3 is done)**

The handler doesn't care about the command name — it just opens the modal. So during the transition both `/jargon` and `/charge` work. No code change needed for this; it's a verification step.

```bash
pnpm dev
# After Pre-1 is done in Slack app config:
# In Slack: /jargon → modal opens
# /charge → modal still opens
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/slack/commands/route.ts
git commit -m "refactor(slack): /jargon is the single entry point; drop subcommands and phrase arg"
```

---

## Task 3: Embed the FINED receipt image inline in the channel message

**Why:** the receipt OG image already exists at [src/app/receipt/[chargeId]/opengraph-image.tsx](../../../src/app/receipt/[chargeId]/opengraph-image.tsx). Embedding it as a Block Kit `image` block makes the channel message look like a citation, not a logline. No upload needed; Slack fetches and caches the URL.

**Files:**
- Modify: [src/lib/slack/notifications.ts](../../../src/lib/slack/notifications.ts) (`buildChargeBlocks`, `ChargeNotificationInput`, `postChargeNotification`)
- Modify: [src/lib/slack/notifications.test.ts](../../../src/lib/slack/notifications.test.ts)

- [ ] **Step 1: Extend `ChargeNotificationInput` and `buildChargeBlocks` signatures**

Add `receiptImageUrl: string` to both `ChargeNotificationInput` and the input type for `buildChargeBlocks`. Pipe it through in `postChargeNotification`.

- [ ] **Step 2: Update the existing block-builder test to expect 4 blocks (section, image, context, actions)**

In [src/lib/slack/notifications.test.ts](../../../src/lib/slack/notifications.test.ts), update the `"formats blocks consistently"` test:

```typescript
it("formats blocks consistently", () => {
  const blocks = buildChargeBlocks({
    chargedSlackUserId: "U1",
    amount: "2",
    termName: "circle back",
    totalOwed: "10",
    leaderboardUrl: "https://example.com/lb",
    receiptUrl: "https://example.com/receipt/abc",
    receiptImageUrl: "https://example.com/receipt/abc/opengraph-image",
  })

  expect(blocks).toHaveLength(4)
  expect(blocks[0].type).toBe("section")
  expect(blocks[1].type).toBe("image")
  expect(blocks[2].type).toBe("context")
  expect(blocks[3].type).toBe("actions")

  const imageBlock = blocks[1] as { type: "image"; image_url: string; alt_text: string }
  expect(imageBlock.image_url).toBe("https://example.com/receipt/abc/opengraph-image")
  expect(imageBlock.alt_text).toContain("circle back")
})
```

Update the other `postChargeNotification` test in the same file to pass `receiptImageUrl: "https://jargonjar.app/receipt/abc-123/opengraph-image"` so it still compiles.

- [ ] **Step 3: Run tests, confirm failure**

```bash
pnpm vitest src/lib/slack/notifications.test.ts
```

Expected: FAIL — block count mismatch and missing image block.

- [ ] **Step 4: Add the image block in `buildChargeBlocks`**

In [src/lib/slack/notifications.ts](../../../src/lib/slack/notifications.ts), update the function body:

```typescript
export function buildChargeBlocks(input: {
  chargedSlackUserId: string
  amount: string
  termName: string
  totalOwed: string
  leaderboardUrl: string
  receiptUrl: string
  receiptImageUrl: string
}): KnownBlock[] {
  const fine = formatMoney(input.amount)
  const total = formatMoney(input.totalOwed)

  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:dollar: *<@${input.chargedSlackUserId}>* was charged *$${fine}* for *"${input.termName}"*.`,
      },
    },
    {
      type: "image",
      image_url: input.receiptImageUrl,
      alt_text: `Citation receipt: ${input.termName} for $${fine}`,
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Running total for <@${input.chargedSlackUserId}>: *$${total}*`,
        },
      ],
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "View receipt" },
          url: input.receiptUrl,
          action_id: "view_receipt",
          style: "primary",
        },
        {
          type: "button",
          text: { type: "plain_text", text: "View leaderboard" },
          url: input.leaderboardUrl,
          action_id: "view_leaderboard",
        },
      ],
    },
  ]
}
```

- [ ] **Step 5: Pass receiptImageUrl from `postChargeNotification` into `buildChargeBlocks`**

```typescript
blocks: buildChargeBlocks({
  chargedSlackUserId,
  amount,
  termName,
  totalOwed,
  leaderboardUrl,
  receiptUrl,
  receiptImageUrl,
}),
```

- [ ] **Step 6: Run tests, verify pass**

```bash
pnpm vitest src/lib/slack/notifications.test.ts
```

Expected: all green.

- [ ] **Step 7: Manual verify**

Charge someone in a channel where the bot is a member. Confirm the citation image renders inline in the Slack message (not as a URL preview). The image URL is `${origin}/receipt/${chargeId}/opengraph-image` and should already be public — no auth needed.

- [ ] **Step 8: Commit**

```bash
git add src/lib/slack/notifications.ts src/lib/slack/notifications.test.ts
git commit -m "feat(slack): embed FINED receipt image inline in charge notifications"
```

---

## Task 4: Filter teammate select to humans only via `external_select`

**Why:** Slack's `users_select` includes bots and apps (Linear, Claude, Figma, etc. in Adam's workspace). External select backed by a server endpoint lets us filter to actual humans and gives us full control over the display.

**Files:**
- Create: `src/app/api/slack/options/route.ts`
- Modify: [src/app/api/slack/commands/route.ts](../../../src/app/api/slack/commands/route.ts) (modal builder — replace `users_select` with `external_select`)
- Modify: [src/app/api/slack/interactions/route.ts](../../../src/app/api/slack/interactions/route.ts) (read `selected_option.value` instead of `selected_user`)
- Modify: [src/lib/slack/api.ts](../../../src/lib/slack/api.ts) (add `listSlackHumans`)
- Create: `src/lib/slack/options.ts` (block_suggestion handler)
- Create: `src/lib/slack/options.test.ts`

- [ ] **Step 1: Add `listSlackHumans` to `src/lib/slack/api.ts`**

Append:

```typescript
type SlackUsersListResponse = {
  ok: boolean
  error?: string
  members?: Array<{
    id: string
    deleted?: boolean
    is_bot?: boolean
    is_app_user?: boolean
    is_restricted?: boolean
    is_ultra_restricted?: boolean
    name?: string
    real_name?: string
    profile?: {
      display_name?: string
      real_name?: string
      image_72?: string
    }
  }>
  response_metadata?: { next_cursor?: string }
}

export type SlackHuman = {
  id: string
  displayName: string
  avatarUrl: string | null
}

export async function listSlackHumans(botToken: string): Promise<SlackHuman[]> {
  const humans: SlackHuman[] = []
  let cursor: string | undefined

  do {
    const url = new URL("https://slack.com/api/users.list")
    url.searchParams.set("limit", "200")
    if (cursor) url.searchParams.set("cursor", cursor)

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${botToken}` },
    })
    const data = (await response.json()) as SlackUsersListResponse
    if (!data.ok || !data.members) {
      throw new Error(data.error ?? "Slack users.list failed")
    }

    for (const m of data.members) {
      if (m.deleted) continue
      if (m.is_bot) continue
      if (m.is_app_user) continue
      if (m.id === "USLACKBOT") continue
      humans.push({
        id: m.id,
        displayName:
          m.profile?.display_name?.trim() ||
          m.profile?.real_name?.trim() ||
          m.real_name ||
          m.name ||
          m.id,
        avatarUrl: m.profile?.image_72 ?? null,
      })
    }

    cursor = data.response_metadata?.next_cursor || undefined
  } while (cursor)

  return humans.sort((a, b) => a.displayName.localeCompare(b.displayName))
}
```

- [ ] **Step 2: Create the options handler**

Create `src/lib/slack/options.ts`:

```typescript
import type { Option } from "@slack/web-api"
import { listSlackHumans } from "./api"
import { listJargonTerms } from "@/lib/db/queries"

export type OptionsBlockId = "charged_user" | "jargon_term"

type Workspace = {
  id: string
  installation: { botToken: string } | null
}

export async function buildMemberOptions(
  workspace: Workspace,
  query: string
): Promise<Option[]> {
  if (!workspace.installation?.botToken) return []
  const humans = await listSlackHumans(workspace.installation.botToken)
  const q = query.trim().toLowerCase()
  const filtered = q
    ? humans.filter((h) => h.displayName.toLowerCase().includes(q))
    : humans
  return filtered.slice(0, 100).map((h) => ({
    text: { type: "plain_text", text: h.displayName },
    value: h.id,
  }))
}

export async function buildTermOptions(
  workspace: Workspace,
  query: string
): Promise<Option[]> {
  const terms = await listJargonTerms(workspace.id)
  const q = query.trim().toLowerCase()
  const matches = q ? terms.filter((t) => t.term.toLowerCase().includes(q)) : terms
  const options: Option[] = matches.slice(0, 99).map((t) => ({
    text: {
      type: "plain_text",
      text: `${t.term} ($${Number(t.defaultCost).toFixed(2)})`,
    },
    value: t.id,
  }))

  if (q && !matches.some((t) => t.term.toLowerCase() === q)) {
    options.unshift({
      text: { type: "plain_text", text: `+ Add new term: "${query.trim()}"` },
      value: `__new__:${query.trim()}`,
    })
  }

  return options
}
```

- [ ] **Step 3: Write tests for the options builders**

Create `src/lib/slack/options.test.ts`:

```typescript
import { describe, expect, it, vi } from "vitest"
import { buildMemberOptions, buildTermOptions } from "./options"

vi.mock("./api", () => ({
  listSlackHumans: vi.fn(),
}))

vi.mock("@/lib/db/queries", () => ({
  listJargonTerms: vi.fn(),
}))

import { listSlackHumans } from "./api"
import { listJargonTerms } from "@/lib/db/queries"

describe("buildMemberOptions", () => {
  it("returns nothing when there is no bot token", async () => {
    const result = await buildMemberOptions(
      { id: "w1", installation: null },
      "ada"
    )
    expect(result).toEqual([])
  })

  it("filters humans by case-insensitive substring", async () => {
    vi.mocked(listSlackHumans).mockResolvedValue([
      { id: "U1", displayName: "Adam Green", avatarUrl: null },
      { id: "U2", displayName: "Steven Harlow", avatarUrl: null },
    ])
    const result = await buildMemberOptions(
      { id: "w1", installation: { botToken: "x" } },
      "adam"
    )
    expect(result).toEqual([
      { text: { type: "plain_text", text: "Adam Green" }, value: "U1" },
    ])
  })
})

describe("buildTermOptions", () => {
  it("prefixes a '+ Add new' option when no exact match", async () => {
    vi.mocked(listJargonTerms).mockResolvedValue([
      { id: "t1", term: "circle back", defaultCost: "1.00", workspaceId: "w1" } as never,
    ])
    const result = await buildTermOptions(
      { id: "w1", installation: { botToken: "x" } },
      "synergy"
    )
    expect(result[0]).toEqual({
      text: { type: "plain_text", text: `+ Add new term: "synergy"` },
      value: "__new__:synergy",
    })
  })

  it("does not add the '+ Add new' option when the query exactly matches an existing term", async () => {
    vi.mocked(listJargonTerms).mockResolvedValue([
      { id: "t1", term: "synergy", defaultCost: "1.00", workspaceId: "w1" } as never,
    ])
    const result = await buildTermOptions(
      { id: "w1", installation: { botToken: "x" } },
      "synergy"
    )
    expect(result.every((o) => !o.value.startsWith("__new__:"))).toBe(true)
  })
})
```

Run: `pnpm vitest src/lib/slack/options.test.ts`. Expected: all green.

- [ ] **Step 4: Add the Slack options endpoint**

Create `src/app/api/slack/options/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { getWorkspaceBySlackTeamId } from "@/lib/db/queries"
import { verifySlackRequest } from "@/lib/slack/security"
import {
  buildMemberOptions,
  buildTermOptions,
  type OptionsBlockId,
} from "@/lib/slack/options"

type BlockSuggestionPayload = {
  type: "block_suggestion"
  team: { id: string }
  block_id: OptionsBlockId | string
  action_id: string
  value: string
}

export async function POST(request: Request) {
  const body = await request.text()
  if (!verifySlackRequest(request, body)) {
    return new Response("Invalid request signature", { status: 401 })
  }

  const formData = new URLSearchParams(body)
  const payloadString = formData.get("payload")
  if (!payloadString) return NextResponse.json({ options: [] })
  const payload = JSON.parse(payloadString) as BlockSuggestionPayload
  if (payload.type !== "block_suggestion") return NextResponse.json({ options: [] })

  const workspace = await getWorkspaceBySlackTeamId(payload.team.id)
  if (!workspace) return NextResponse.json({ options: [] })

  const query = payload.value ?? ""

  if (payload.block_id === "charged_user") {
    const options = await buildMemberOptions(workspace, query)
    return NextResponse.json({ options })
  }

  if (payload.block_id === "jargon_term") {
    const options = await buildTermOptions(workspace, query)
    return NextResponse.json({ options })
  }

  return NextResponse.json({ options: [] })
}
```

- [ ] **Step 5: Swap the modal `charged_user` block to `external_select`**

In [src/app/api/slack/commands/route.ts](../../../src/app/api/slack/commands/route.ts), `buildChargeModal`, replace the `charged_user` block with:

```typescript
{
  type: "input",
  block_id: "charged_user",
  label: { type: "plain_text", text: "Who said it?" },
  element: {
    type: "external_select",
    action_id: "value",
    placeholder: { type: "plain_text", text: "Select a teammate" },
    min_query_length: 0,
  },
},
```

- [ ] **Step 6: Update interactions handler to read `selected_option.value` for `charged_user`**

In [src/app/api/slack/interactions/route.ts](../../../src/app/api/slack/interactions/route.ts), line 66:

Change:
```typescript
const chargedSlackUserId = values.charged_user?.value?.selected_user
```

To:
```typescript
const chargedSlackUserId = values.charged_user?.value?.selected_option?.value
```

- [ ] **Step 7: Manual verify**

In Slack, open the `/jargon` modal. Type into the teammate picker. Confirm: only humans appear. Linear, Claude, Slackbot, Giphy, etc. do not. Charge someone, confirm the rest of the flow still works.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/slack/options src/lib/slack/options.ts src/lib/slack/options.test.ts src/lib/slack/api.ts src/app/api/slack/commands/route.ts src/app/api/slack/interactions/route.ts
git commit -m "feat(slack): filter teammate picker to humans via external_select"
```

---

## Task 5: Collapse the term picker into one path, drop the duplicate text input

**Why:** Today the form has both a dropdown ("Existing jargon term") *and* a text input ("Or add a new term"), both optional, with validation that one must be set. That's two fields encoding one decision. With `buildTermOptions` (Task 4) already offering "+ Add new term '<query>'", we can collapse to a single `external_select` and create the term on submit when the value starts with `__new__:`.

**Files:**
- Modify: [src/app/api/slack/commands/route.ts](../../../src/app/api/slack/commands/route.ts) (`buildChargeModal`)
- Modify: [src/app/api/slack/interactions/route.ts](../../../src/app/api/slack/interactions/route.ts) (`handleChargeSubmission`)

- [ ] **Step 1: Replace the `jargon_term` and `custom_term` blocks with a single external_select**

In `buildChargeModal`, delete the entire `custom_term` input block and rewrite `jargon_term`:

```typescript
{
  type: "input",
  block_id: "jargon_term",
  label: { type: "plain_text", text: "Jargon term" },
  element: {
    type: "external_select",
    action_id: "value",
    placeholder: { type: "plain_text", text: "Type to search or add a new term" },
    min_query_length: 1,
  },
},
```

Also delete the `terms` parameter and the `listJargonTerms` call from the slash command handler — terms are loaded on-demand via the options endpoint now.

- [ ] **Step 2: Rewrite term resolution in `handleChargeSubmission`**

In [src/app/api/slack/interactions/route.ts](../../../src/app/api/slack/interactions/route.ts), replace the `selectedTermValue`/`selectedTermId`/`customTerm` block (lines 67–69) and the term-resolution block (lines 102–123) with:

```typescript
const selectedTermValue = values.jargon_term?.value?.selected_option?.value
// ... amount, messageText, errors block ...

const errors: Record<string, string> = {}
if (!chargedSlackUserId) errors.charged_user = "Pick a teammate to charge."
if (!selectedTermValue) errors.jargon_term = "Pick a term or add a new one."
// ... (drop the amount validation here — amount comes from the term in Task 6)

if (Object.keys(errors).length > 0) {
  return NextResponse.json({ response_action: "errors", errors })
}

// ...workspace lookup, members ensure...

let termId: string
let termName: string
let amount: string

if (selectedTermValue!.startsWith("__new__:")) {
  const newName = selectedTermValue!.slice("__new__:".length).trim()
  if (!newName) {
    return NextResponse.json({
      response_action: "errors",
      errors: { jargon_term: "Type a term name to add." },
    })
  }
  const existing = await findJargonTerm({ workspaceId: workspace.id, term: newName })
  const term =
    existing ??
    (await createJargonTerm({
      workspaceId: workspace.id,
      term: newName,
      defaultCost: "1.00", // default starter cost; admin can edit on the dashboard
      createdById: chargingMember.id,
    }))
  termId = term.id
  termName = term.term
  amount = Number(term.defaultCost).toFixed(2)
} else {
  const term = await db.query.jargonTerms.findFirst({
    where: eq(jargonTerms.id, selectedTermValue!),
  })
  if (!term) {
    return NextResponse.json({
      response_action: "errors",
      errors: { jargon_term: "That term no longer exists. Pick another." },
    })
  }
  termId = term.id
  termName = term.term
  amount = Number(term.defaultCost).toFixed(2)
}
```

Add the imports at the top of the file:

```typescript
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { jargonTerms } from "@/lib/db/schema"
```

- [ ] **Step 3: Manual verify**

In Slack:
1. Open `/jargon`, type "syn" → existing "synergy" shows up, "+ Add new term: 'syn'" shows up. Pick existing → charge. Pick "+ Add new term" → term is created on submit.
2. Pick a teammate from the (human-only) picker.
3. Submit. Receipt image appears in channel.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/slack/commands/route.ts src/app/api/slack/interactions/route.ts
git commit -m "feat(slack): single term picker with inline add-new"
```

---

## Task 6: Remove the per-charge amount override from the modal

**Why:** if "synergy" costs $1 in the workspace and the form pre-fills $1, letting the user retype it adds nothing but confusion. The cost is owned by the term; admins edit it on the dashboard. Removing the field cuts the form from 5 inputs to 3.

**Files:**
- Modify: [src/app/api/slack/commands/route.ts](../../../src/app/api/slack/commands/route.ts) (`buildChargeModal`)
- Modify: [src/app/api/slack/interactions/route.ts](../../../src/app/api/slack/interactions/route.ts)

- [ ] **Step 1: Delete the `amount` input block**

In `buildChargeModal`, remove the entire `amount` input block.

- [ ] **Step 2: Delete the amount reading and validation in the interactions handler**

In [src/app/api/slack/interactions/route.ts](../../../src/app/api/slack/interactions/route.ts):
- Remove `const amount = values.amount?.value?.value?.trim()` (line 70)
- Remove the `if (!amount || ...)` validation block (lines 78–80)
- Remove `amount: amount!` from the `createJargonTerm` call (the `defaultCost: "1.00"` literal added in Task 5 still serves new-term creation)
- Remove `amount: amount!` from the `createCharge` call and replace with `amount` (now sourced from the term resolution block in Task 5)

The term resolution block in Task 5 already sets the local `amount` variable from the term's `defaultCost`. Everything downstream that needs `amount` reads from that same variable.

- [ ] **Step 3: Manual verify**

Open `/jargon`. Confirm: form has three fields — Who said it, Jargon term, Context. No "Virtual fine" field. Charge someone using an existing term — amount in the channel message equals the term's `defaultCost`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/slack/commands/route.ts src/app/api/slack/interactions/route.ts
git commit -m "feat(slack): amount is owned by the term, drop modal override"
```

---

## Task 7: Show the context phrase in the channel message

**Why:** Today the modal collects "Context — what did they say?" but it never appears anywhere visible (it's stored on the `charges` row, but neither the channel message nor the ephemeral nor the receipt page surfaces it prominently). Either show it or remove the field. We show it — the quoted phrase is the whole punchline.

**Files:**
- Modify: [src/lib/slack/notifications.ts](../../../src/lib/slack/notifications.ts) (`ChargeNotificationInput`, `buildChargeBlocks`)
- Modify: [src/lib/slack/notifications.test.ts](../../../src/lib/slack/notifications.test.ts)
- Modify: [src/app/api/slack/interactions/route.ts](../../../src/app/api/slack/interactions/route.ts) (pass context through)

- [ ] **Step 1: Add `context?: string | null` to `ChargeNotificationInput` and the `buildChargeBlocks` input type**

- [ ] **Step 2: Add a failing test asserting the context appears as a quoted block when provided**

Add to [src/lib/slack/notifications.test.ts](../../../src/lib/slack/notifications.test.ts):

```typescript
it("includes the context phrase as a quoted block when provided", () => {
  const blocks = buildChargeBlocks({
    chargedSlackUserId: "U1",
    amount: "2",
    termName: "circle back",
    totalOwed: "10",
    leaderboardUrl: "https://example.com/lb",
    receiptUrl: "https://example.com/receipt/abc",
    receiptImageUrl: "https://example.com/receipt/abc/opengraph-image",
    context: "let's circle back on this Q3",
  })

  const contextBlock = blocks.find(
    (b: { type: string; text?: { text?: string } }) =>
      b.type === "section" && b.text?.text?.includes("circle back on this Q3")
  )
  expect(contextBlock).toBeDefined()
})

it("does not render a context block when context is empty", () => {
  const blocks = buildChargeBlocks({
    chargedSlackUserId: "U1",
    amount: "2",
    termName: "circle back",
    totalOwed: "10",
    leaderboardUrl: "https://example.com/lb",
    receiptUrl: "https://example.com/receipt/abc",
    receiptImageUrl: "https://example.com/receipt/abc/opengraph-image",
    context: "",
  })
  expect(blocks).toHaveLength(4)
})
```

Run: `pnpm vitest src/lib/slack/notifications.test.ts`. Expected: first new test fails.

- [ ] **Step 3: Render the context block in `buildChargeBlocks`**

Insert this between the existing `section` headline block and the `image` block, *only when context is non-empty*:

```typescript
...(input.context && input.context.trim().length > 0
  ? [
      {
        type: "section" as const,
        text: {
          type: "mrkdwn" as const,
          text: `> ${input.context.trim().replace(/\n/g, "\n> ")}`,
        },
      },
    ]
  : []),
```

So the final block list is conditionally `[headline, (context?), image, running-total, actions]`.

- [ ] **Step 4: Pipe context through `postChargeNotification` and `postChargeNotificationWithFallback`**

`postChargeNotification` passes `context: input.context` into `buildChargeBlocks`. `postChargeNotificationWithFallback` passes the same `context` through. (Since the fallback ephemeral is a single text line, it doesn't need to render the context — but you may include it in the ephemeral text if you want. Pragmatic: skip it in the ephemeral.)

- [ ] **Step 5: Pass `context: messageText` from the interactions handler**

In [src/app/api/slack/interactions/route.ts](../../../src/app/api/slack/interactions/route.ts), in the `postChargeNotificationWithFallback` call added in Task 1 Step 6:

```typescript
context: messageText,
```

- [ ] **Step 6: Run tests, verify pass**

```bash
pnpm vitest src/lib/slack/notifications.test.ts
```

Expected: all green.

- [ ] **Step 7: Manual verify**

Open `/jargon`, charge with a phrase like *"let's leverage our synergies"* in the Context field. Confirm the channel message renders the receipt image AND a Slack quote block above it showing the phrase.

- [ ] **Step 8: Commit**

```bash
git add src/lib/slack/notifications.ts src/lib/slack/notifications.test.ts src/app/api/slack/interactions/route.ts
git commit -m "feat(slack): surface the charged phrase as a quote in the channel message"
```

---

## Task 8: Cleanup pass

- [ ] **Step 1: Adam deletes the `/charge` slash command in api.slack.com/apps** (Pre-3)

- [ ] **Step 2: Update README / dashboard help copy to reference `/jargon` instead of `/charge`**

```bash
grep -rn "/charge" README.md docs/ src/app
```

Replace any user-facing references. Internal API route paths (`/api/slack/commands`) stay.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "docs: switch /charge references to /jargon"
```

---

## Self-Review Notes

**Coverage check:** Each of the seven concerns from the brainstorm has a task:

| Concern | Task |
|---|---|
| `/charge` vs `/jargon` namespace | Task 2 + Pre-work |
| Optional phrase argument is dead weight | Task 2 |
| Two optional term fields are confusing | Task 5 |
| Per-charge amount override is confusing | Task 6 |
| Context field collected but not displayed | Task 7 |
| Bots appear in teammate picker | Task 4 |
| Nothing posts after a charge | Task 1 |

**Risks:**

- `users.list` is rate-limited (Tier 2: ~20 req/min). For a workspace with thousands of members this paginates a lot per `external_select` request. v1 acceptable; cache in-memory per workspace if it becomes an issue.
- Slack caches inline image URLs aggressively. If the OG image changes shape, existing channel messages keep the old image. Acceptable — receipts are immutable.
- `external_select` requires the global Options Load URL be set in the Slack app config (Pre-2). Without it, both pickers will show "Failed to fetch options".
- Removing the amount override means the only way to charge a non-default amount is to either (a) edit the term's default on the dashboard or (b) add the override back later. Confirm with Adam this is the intended tradeoff before shipping Task 6.

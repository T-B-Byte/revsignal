# Threaded Coaching Architecture — Implementation Plan

> Replace the single-stream `/coach` page with a ChatGPT-style threaded system where each deal gets its own persistent coaching thread, plus a Master Strategist that orchestrates across all threads.

---

## Architecture Overview

### What Changes

| Current | New |
|---------|-----|
| Single coaching conversation (flat list in `coaching_conversations`) | Multiple named threads, each with its own message history |
| Deal context selected via dropdown per message | Thread is permanently associated with a deal (or general) |
| One coach page with one chat | Thread list sidebar + chat view, like ChatGPT |
| No thread memory/summary | Progressive summarization per thread (thread briefs) |
| Follow-up enforcement lives in a separate agent | Follow-up reminders surfaced directly in thread context |
| No "where we left off" | Thread re-entry generates a catch-up summary |

### What Stays the Same

- The Strategist agent (`lib/agents/strategist.ts`) remains the brain
- RAG-first architecture (retrieval before generation)
- Morning briefings on the dashboard (unchanged)
- Deal briefs, conversation timeline, meeting notes (all feed INTO threads as context)
- All existing hallucination prevention rules

---

## Database Schema Changes

### New Table: `coaching_threads`

```sql
CREATE TABLE coaching_threads (
  thread_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id         uuid REFERENCES deals(deal_id) ON DELETE SET NULL,
  title           text NOT NULL,              -- "Apollo Data Partnership", "General Strategy", etc.
  thread_brief    text,                       -- Progressive summary of thread history (anti-hallucination)
  brief_updated_at timestamptz,               -- When the brief was last regenerated
  last_message_at timestamptz DEFAULT now(),  -- For sorting threads by recency
  message_count   int DEFAULT 0,              -- For knowing when to trigger summarization
  is_archived     boolean DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
```

### Modify: `coaching_conversations` — Add `thread_id`

```sql
ALTER TABLE coaching_conversations
  ADD COLUMN thread_id uuid REFERENCES coaching_threads(thread_id) ON DELETE CASCADE;
```

Existing messages with `thread_id IS NULL` remain accessible (legacy) but won't appear in the new UI. Clean migration path.

### New Table: `thread_follow_ups`

Tracks follow-up reminders specific to a thread. These are extracted by the Strategist from the conversation and surfaced on thread re-entry.

```sql
CREATE TABLE thread_follow_ups (
  follow_up_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id       uuid NOT NULL REFERENCES coaching_threads(thread_id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description     text NOT NULL,
  due_date        date,                       -- Explicit follow-up date (if user specified)
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed', 'dismissed')),
  source_message_id uuid,                     -- Which coaching message created this
  created_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz
);
```

### New Index Support

```sql
-- Thread listing (user's threads, sorted by recency)
CREATE INDEX idx_coaching_threads_user_id_recent ON coaching_threads(user_id, last_message_at DESC);
CREATE INDEX idx_coaching_threads_user_id_deal ON coaching_threads(user_id, deal_id);

-- Messages by thread
CREATE INDEX idx_coaching_conversations_thread ON coaching_conversations(thread_id, created_at ASC);

-- Follow-ups by thread + status
CREATE INDEX idx_thread_follow_ups_thread ON thread_follow_ups(thread_id, status);
CREATE INDEX idx_thread_follow_ups_user_overdue ON thread_follow_ups(user_id, status, due_date)
  WHERE status = 'open';
```

---

## Hallucination Prevention in Long Threads

### Progressive Thread Brief

This is the core mechanism. As a thread grows, older messages are summarized into a `thread_brief` that captures:

- **Key facts** (pricing discussed, commitments made, decisions reached)
- **Open items** (follow-ups, unanswered questions, pending actions)
- **Context references** (which conversations, meetings, and contacts were discussed)

**Trigger:** After every 20 messages, regenerate the thread brief.

**What Claude receives per request:**
1. Thread brief (1-2 paragraphs covering full history)
2. Last 10 messages (recent context, verbatim)
3. RAG-retrieved deal context (deal brief, recent conversations, action items, contacts)
4. Open follow-ups for this thread

**What Claude does NOT receive:**
- Full raw message history beyond the last 10
- Raw email/chat text from conversations (only ai_summary, as today)

This is identical to how deal briefs work today. Proven pattern, just applied to coaching threads.

---

## Follow-Up Enforcement in Threads

### How Follow-Ups Are Created

1. **Explicit:** User says "I need to follow up with Sarah by Friday" — Strategist extracts this and creates a `thread_follow_ups` entry with `due_date`.
2. **Implicit (stale thread):** If a deal-linked thread has no activity for 7+ days, the Strategist flags it on thread re-entry: "It's been 9 days since you last discussed this deal. Last open item was..."
3. **From action_items:** The existing `action_items` table already tracks commitments. Thread context will include open action items for the linked deal.

### How Follow-Ups Surface

- **Thread re-entry:** When you open a thread, the catch-up summary includes open follow-ups and overdue items.
- **Master Strategist (dashboard briefing):** The morning briefing already pulls action items. It will also pull thread follow-ups across all threads.
- **Thread list sidebar:** Threads with overdue follow-ups get a visual indicator (red dot or badge).

---

## UI Architecture

### Route: `/coach` (replaces current page)

**Layout:** Two-panel like ChatGPT.

```
┌─────────────────────────────────────────────────────┐
│  Thread Sidebar (280px)  │     Chat Area             │
│                          │                           │
│  [+ New Thread]          │  Thread Title + Deal Tag  │
│                          │                           │
│  ● Apollo Partnership    │  ┌─────────────────────┐  │
│    Last: 2 days ago      │  │ Catch-up summary    │  │
│    ⚠ 1 overdue item      │  │ (on re-entry)       │  │
│                          │  └─────────────────────┘  │
│  Pricing Strategy        │                           │
│    Last: 5 days ago      │  [Message history]        │
│                          │                           │
│  SAP Data Deal           │                           │
│    Last: 1 week ago      │                           │
│    🔴 Stale              │                           │
│                          │  ┌─────────────────────┐  │
│  General Strategy        │  │ Open Follow-ups (2)  │  │
│    Last: today           │  │ ☐ Send pricing...   │  │
│                          │  │ ☐ Schedule call...  │  │
│  [Archived threads ▾]   │  └─────────────────────┘  │
│                          │                           │
│                          │  [Input area]             │
└─────────────────────────────────────────────────────┘
```

### Components to Build

| Component | Purpose |
|-----------|---------|
| `components/coaching/thread-sidebar.tsx` | Thread list with new thread button, search, overdue indicators |
| `components/coaching/thread-chat.tsx` | Message history + input (evolution of current `coaching-chat.tsx`) |
| `components/coaching/new-thread-dialog.tsx` | Create thread: name it, optionally link a deal |
| `components/coaching/thread-catchup.tsx` | "Here's where we left off" banner on thread re-entry |
| `components/coaching/thread-follow-ups.tsx` | Open follow-ups panel within a thread |

### Page Structure

```
app/(dashboard)/coach/
  page.tsx                  → Server component: fetch threads list, redirect to most recent or empty state
  [threadId]/
    page.tsx                → Server component: fetch thread + messages + follow-ups + deal context
```

URL pattern: `/coach` shows thread list (or last-used thread), `/coach/[threadId]` opens a specific thread.

### Mobile Consideration

On small screens, the sidebar collapses to a hamburger/drawer. Thread chat takes full width.

---

## API Routes

### New Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `api/coaching/threads` | GET | List user's threads (with last_message_at, message_count, overdue follow-up count) |
| `api/coaching/threads` | POST | Create new thread (title, optional deal_id) |
| `api/coaching/threads/[threadId]` | PATCH | Update thread (title, archive, link/unlink deal) |
| `api/coaching/threads/[threadId]` | DELETE | Delete thread and all messages |
| `api/coaching/threads/[threadId]/messages` | GET | Fetch messages for a thread (paginated) |
| `api/coaching/threads/[threadId]/messages` | POST | Send a message in a thread (calls Strategist) |
| `api/coaching/threads/[threadId]/catchup` | GET | Generate "where we left off" summary for thread re-entry |
| `api/coaching/threads/[threadId]/follow-ups` | GET | List open follow-ups for a thread |
| `api/coaching/threads/[threadId]/follow-ups/[id]` | PATCH | Mark follow-up complete/dismissed |

### Modified Routes

| Route | Change |
|-------|--------|
| `api/agents/coaching` | Deprecate (or redirect to thread-based endpoint) |

---

## Strategist Agent Changes

### `generateThreadResponse()` — New function in `strategist.ts`

Replaces `generateCoachingResponse()` for threaded context. Key differences:

1. **Receives thread_id** instead of ad-hoc deal selection
2. **Loads thread brief** + last 10 messages (not flat history)
3. **Auto-loads deal context** if thread is linked to a deal (conversations, meeting notes, action items, contacts, deal brief)
4. **Extracts follow-ups** from the response and creates `thread_follow_ups` entries
5. **Triggers brief regeneration** when message_count crosses threshold (every 20 messages)

### `generateThreadCatchup()` — New function

Called on thread re-entry. Generates a short summary:
- Where the conversation left off
- Open follow-ups (with due dates and overdue flags)
- Key changes to the deal since last thread activity (new conversations, stage changes, new contacts)
- Recommendation for what to do next

### `generateThreadBrief()` — New function

Progressive summarization. Takes the full message history and produces a structured brief:
- Key facts and decisions
- Open items and commitments
- Context references (dates, people, sources)
- Follow-up status

### Master Strategist Awareness

The morning briefing (`generateMorningBriefing`) already retrieves all deals and action items. Extend it to also pull:
- Threads with overdue follow-ups
- Stale deal-linked threads (no activity 7+ days on active deals)
- Open thread follow-ups across all threads

This feeds into the "Top 3 Priorities" and "Overdue & Upcoming" sections naturally.

---

## Build Order

### Phase 1: Database + Types (Migration 011)
- [ ] Write migration `011_coaching_threads.sql`
- [ ] Update `types/database.ts` with new types
- [ ] Run migration

### Phase 2: API Routes
- [ ] `api/coaching/threads` (GET, POST)
- [ ] `api/coaching/threads/[threadId]` (PATCH, DELETE)
- [ ] `api/coaching/threads/[threadId]/messages` (GET, POST)
- [ ] `api/coaching/threads/[threadId]/catchup` (GET)
- [ ] `api/coaching/threads/[threadId]/follow-ups` (GET, PATCH)

### Phase 3: Strategist Agent Updates
- [ ] `generateThreadResponse()` in strategist.ts
- [ ] `generateThreadCatchup()` in strategist.ts
- [ ] `generateThreadBrief()` in strategist.ts
- [ ] Update RAG retriever for thread context
- [ ] Follow-up extraction from Strategist responses

### Phase 4: UI Components
- [ ] Thread sidebar component
- [ ] Thread chat component (evolve from coaching-chat.tsx)
- [ ] New thread dialog
- [ ] Thread catch-up banner
- [ ] Thread follow-ups panel

### Phase 5: Page Assembly + Navigation
- [ ] `/coach` page (thread list + default view)
- [ ] `/coach/[threadId]` page (thread chat view)
- [ ] Update sidebar nav (already points to `/coach`)
- [ ] Mobile responsive layout

### Phase 6: Master Strategist Integration
- [ ] Extend morning briefing to include thread follow-ups
- [ ] Extend morning briefing to flag stale threads
- [ ] Dashboard thread activity indicator

### Phase 7: Polish
- [ ] Thread search/filter
- [ ] Thread archiving
- [ ] Keyboard shortcuts (Cmd+K to search threads, Cmd+N for new thread)
- [ ] Build + post-build review

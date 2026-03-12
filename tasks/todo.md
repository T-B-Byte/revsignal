# StrategyGPT Consolidation — Implementation Plan

> Consolidate Strategy (Coach), Meetings, and Compose into a single **StrategyGPT** section.
> Each thread = a **person** associated with an **account** (company).
> All intelligence about a prospect lives in one place — no more jumping between sections.

---

## Core Concept

**Before:** Three separate sections — Strategy (coaching threads), Meetings (meeting notes), Compose (email drafts + conversation logging).
**After:** One section — **StrategyGPT**. Each thread is a person (e.g., "Anna Eliot" @ pharosIQ). When you add intel, you tag it with the source type.

### Interaction Types (per message)
When adding a note to a thread, select the source:
- **Email** — pasted email correspondence
- **Conversation** — informal chat, Teams message, Slack, etc.
- **Call Transcript** — call recording / PLAUD transcript
- **Web Meeting** — Zoom, Teams, Google Meet
- **In-Person Meeting** — face-to-face
- **Ask Strategist** — question for The Strategist AI (triggers AI response)

Only "Ask Strategist" messages trigger an AI response. All others are logged as intel.

---

## Database Changes

### ALTER `coaching_threads` — add person/account fields
```sql
ALTER TABLE coaching_threads
  ADD COLUMN contact_name text,        -- "Anna Eliot"
  ADD COLUMN contact_role text,        -- "CMO"
  ADD COLUMN company text,             -- "pharosIQ"
  ADD COLUMN contact_id uuid REFERENCES contacts(contact_id) ON DELETE SET NULL;
```

### ALTER `coaching_conversations` — add interaction type
```sql
ALTER TABLE coaching_conversations
  ADD COLUMN interaction_type text DEFAULT 'coaching'
    CHECK (interaction_type IN ('email', 'conversation', 'call_transcript', 'web_meeting', 'in_person_meeting', 'coaching'));
```

---

## Type Changes (`types/database.ts`)

- [ ] Add `InteractionType` union type
- [ ] Add `INTERACTION_TYPES` constant array (value + label + icon)
- [ ] Update `CoachingThread` with `contact_name`, `contact_role`, `company`, `contact_id`
- [ ] Update `CoachingMessage` with `interaction_type`
- [ ] Update `CoachingThreadWithDeal` accordingly

---

## UI Changes

### Sidebar Navigation (`components/dashboard/sidebar.tsx`)
- [ ] Remove "Meetings" nav item
- [ ] Remove "Compose" nav item
- [ ] Rename "Strategy" to "StrategyGPT"

### New Thread Dialog (`components/coaching/new-thread-dialog.tsx`)
- [ ] Replace "Thread name" with "Person Name" (required)
- [ ] Add "Role / Title" field (optional)
- [ ] Add "Account / Company" field (required)
- [ ] Keep deal link (optional)

### Thread Sidebar (`components/coaching/thread-sidebar.tsx`)
- [ ] Group threads by company
- [ ] Show contact_name as primary, company + role as secondary
- [ ] Keep follow-up indicators

### Thread Chat (`components/coaching/thread-chat.tsx`)
- [ ] Add interaction type selector (toggle bar above textarea)
- [ ] Show interaction type badge on each message
- [ ] Change placeholder text based on selected type
- [ ] When type != "coaching", just save the note (no AI call)
- [ ] When type == "coaching", call Strategist as before

### Coach Page (`app/(dashboard)/coach/page.tsx`)
- [ ] Update metadata: "StrategyGPT | RevSignal"
- [ ] Update empty state messaging

### CoachShell (`app/(dashboard)/coach/coach-shell.tsx`)
- [ ] Update optimistic thread creation with new fields

---

## API Changes

### POST /api/coaching/threads
- [ ] Accept `contact_name`, `contact_role`, `company`, `contact_id`
- [ ] Update validation schema

### POST /api/coaching/threads/[threadId]/messages
- [ ] Accept `interaction_type` in request body
- [ ] When interaction_type != 'coaching': save message only (no AI)
- [ ] When interaction_type == 'coaching': call Strategist as before
- [ ] Validate interaction_type enum

### PATCH /api/coaching/threads/[threadId]
- [ ] Accept updates to `contact_name`, `contact_role`, `company`

---

## Migration: Meeting Notes → StrategyGPT Threads

- [ ] Query meeting_notes with attendee name containing "Anna" → create "Anna Eliot" thread @ pharosIQ (CMO), migrate content
- [ ] Create "Marty Fettig" thread @ pharosIQ (EVP Sales)
- [ ] Create "Ben Lefkowitz" thread @ pharosIQ (VP Sales, EMEA & APAC)
- [ ] Each meeting note becomes a coaching_conversation with interaction_type based on meeting_type

---

## Files to Remove

- [ ] `app/(dashboard)/meetings/page.tsx`
- [ ] `app/(dashboard)/meetings/[noteId]/edit/page.tsx`
- [ ] `app/(dashboard)/meetings/actions.ts`
- [ ] `app/(dashboard)/compose/page.tsx`
- [ ] `components/meetings/` (all files)
- [ ] `components/compose/email-composer.tsx`

---

## Build Order

### Phase 1: Database + Types
- [ ] Write Supabase migration SQL
- [ ] Update types/database.ts
- [ ] Run migration

### Phase 2: API Route Updates
- [ ] Update POST /api/coaching/threads (new fields)
- [ ] Update POST /api/coaching/threads/[threadId]/messages (interaction_type + conditional AI)
- [ ] Update PATCH /api/coaching/threads/[threadId] (new fields)

### Phase 3: UI Rewrite
- [ ] Sidebar nav changes
- [ ] New thread dialog rewrite
- [ ] Thread sidebar rewrite (grouped by company)
- [ ] Thread chat rewrite (interaction type selector + badges)
- [ ] CoachShell + page metadata updates

### Phase 4: Data Migration
- [ ] Run migration script to convert meeting notes to threads

### Phase 5: Cleanup
- [ ] Remove meetings pages + components
- [ ] Remove compose pages + components
- [ ] Build + post-build review

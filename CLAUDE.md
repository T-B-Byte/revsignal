# CLAUDE.md — RevSignal

> *Where signals become revenue.*

RevSignal is a personal DaaS sales command center for a solo sales leader building B2B data licensing from scratch. It tracks pipeline, ingests communications, manages follow-ups, runs AI agents, and coaches GTM execution toward a $1M first-year revenue target. **Not a generic CRM.**

---

## Build & Development

```bash
npm run dev          # Dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npx tsc --noEmit     # Type check
```

Seed scripts: `npm run seed`, `seed:dry-run`, `seed:competitors`, `seed:icps`, `seed:playbook`

Custom scripts (excluded from tsconfig): `npx tsx scripts/your-script.ts`

---

## Architecture

**Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Supabase, Claude Sonnet 4.6, Stripe, SendGrid

### Route Groups
- `(auth)/` — Login, signup, password reset, Microsoft SSO
- `(dashboard)/` — Protected dashboard: deals, prospects, playbook, compete, compose, marketing, settings, coach
- `(marketing)/` — Public pages (future productization)
- `admin/` — Admin panel
- `api/agents/` — Agent orchestration | `api/ingest/` — Data ingestion (Teams, Outlook, SFDC, transcripts)
- `api/webhooks/` — Stripe, Microsoft Graph, Salesforce | `api/cron/` — Scheduled jobs

### Middleware (`middleware.ts`)
Token capture (`?token=TOKEN` to cookie), session refresh via `updateSession()`, integration health headers.

### Supabase Clients

| Client | Import | Use When |
|--------|--------|----------|
| `createClient()` | `lib/supabase/client.ts` | Client components (`'use client'`) |
| `createClient()` | `lib/supabase/server.ts` | Server components, API routes (respects RLS) |
| `createAdminClient()` | `lib/supabase/admin.ts` | Bypassing RLS (admin ops, crons, agent pipelines) |

**CRITICAL: `user_profiles` has TWO UUID columns.** `id` is the row PK. `user_id` is the FK to `auth.users.id`. Always query by `user_id` when looking up by auth user. This applies to all user-centric tables.

---

## Agent Architecture

Multi-agent system powered by Claude Sonnet 4.6 via Anthropic SDK with tool use.

**The Strategist** (Master Agent, `lib/agents/strategist.ts`): Daily briefings, deal strategy, pattern recognition, revenue forecasting, weekly memos, GTM playbook coaching across all 12 workstreams.

**Sub-agents:** Prospect Scout, Follow-Up Enforcer, Call Analyst, Competitive Watcher, Email Composer, SFDC Sync (all in `lib/agents/`).

### Agent Rules
- **RAG retrieval BEFORE every generation.** Never respond from context window alone.
- **Cite sources.** Every fact references a conversation_id, date, and channel. No source = "I don't have a record of that."
- **Never invent data.** No fabricated pricing, dates, commitments, metrics, or contacts.
- **Per-deal context silos.** Never cross-contaminate deal contexts.
- **Async processing.** Long-running tasks are background jobs, not blocking requests.
### Integration Resilience
Every integration must gracefully degrade. If an API is down, fall back to manual mode. The app is never unusable because one integration is offline. Status visible at `/settings`.

---

## Data Pipeline

**Summarization ladder:** Raw text (stored, never sent to Claude in full) -> 3-5 sentence Summary (what agents read) -> Deal Brief (rolling per-deal summary, primary context) -> Weekly Digest (Fridays, pattern recognition). Agents get the Deal Brief, not 50 raw emails.

---

## Hallucination Prevention — CRITICAL

1. **Never state a fact without citing the source record** (conversation_id, date, channel). No source = "I don't have a record of that."
2. **Never invent** pricing, dates, commitments, metrics, or contact details.
3. **Never confuse contacts between deals.** Each deal is a context silo.
4. **Flag uncertainty.** Incomplete data gets flagged: "transcript was incomplete, confirm with your notes."
5. **Timestamp everything.** When captured, when analyzed, how fresh.
6. **Detect conflicts.** Contradictions between records get surfaced for user resolution.

---

## Stripe Tiers

| Tier | Price | Key Features |
|------|-------|-------------|
| Free | $0 | Dashboard, 3 deals, manual logging, basic reminders |
| Starter | $49/mo | Unlimited deals, Microsoft + SFDC integration, email composer, 10 prospect searches/mo |
| Power | $149/mo | Everything + Strategist briefings, transcripts, weekly memos, unlimited research, playbook coaching |

---

## Workflow Process

1. **Think first.** Read relevant files before making changes.
2. **Plan in `tasks/todo.md`.** Actionable TODOs with checkboxes.
3. **Wait for approval** before coding.
4. **Execute gradually.** One TODO at a time, mark complete, explain changes.
5. **Prefer simplicity.** Smallest changes, fewest files, minimal complexity.
6. **Use background agents** for independent parallel work.
7. **Always commit and push** after completing work.

---

## Engineering Standards

- Find and fix root causes. No band-aid fixes.
- Minimal-impact changes only. No broad refactors without approval.
- Agent responses must be grounded in retrieved data with source citations.
- Pipeline stages are sacred: agents suggest stage changes, never auto-advance without user confirmation.
- If you notice a faster/better approach, stop and tell me.

### Bug Fixes: Prove It Pattern

1. **Reproduce** with a subagent-written test (unit > integration > E2E). Test should fail before fix.
2. **Fix** the root cause.
3. **Confirm** the test passes.

If environment-specific, document why a test isn't feasible.

---

## Tina's Voice & Tone

**Lead with the point.** No throat-clearing, no "I wanted to reach out because..."

**Never defensive or apologetic.** No "just," no justifying before asking. State needs with confidence.

**Never imply the team hasn't done something.** Frame work as additive ("diversifies the revenue mix"), not comparative.

**Don't teach what they know.** Don't explain valuation to a CEO or data licensing to a data company.

**Concise beats verbose.** If a sentence can lose 3 words, lose them.

**No unnecessary paper trails.** No specific target companies in emails, no comp numbers where they don't belong, no board-level info in writing.

**Warm, professional, direct.** Smart peer to smart peer. Confident, not arrogant.

**NEVER use em dashes.** Em dashes are an AI writing signal. Use commas, periods, colons, or parentheses. Zero exceptions.

---

## Shareable Documents

Shareable documents live in two locations depending on format:

- **React pages** go in `app/frameworks/<company>/` with `page.tsx` + `layout.tsx`. Public, unauthenticated, designed for clean presentation and print.
- **Static HTML docs** go in `public/`. Accessible at `/<filename>.html`.

After creating or updating a document:
1. Add an entry to the `DEFAULT_DOCS` array in `app/(dashboard)/docs/page.tsx` (the Documents portal) with id, title, description, url, password, category, and created date.
2. Log its URL in `reference_live_documents.md`.

| Route | Description |
|-------|-------------|
| `/frameworks/ibm` | IBM: DaaS Tiered Licensing Model |
| `/daas-framework.html` | DaaS Product Framework (tiers, surge products, account matrix) |
| `/matrix.html` | Account matrix standalone (shared Supabase state with daas-framework) |

---

## Key Reference Files

| File | Purpose |
|------|---------|
| `prompt-daas-sales-app.md` | Full app spec (modules, agents, integrations, math) |
| `daas-gtm-playbook.md` | 12-workstream GTM playbook (Strategist's curriculum) |
| `brand/voice-profile.md` | Voice profile for content generation |
| `call-prep-jeff-rokuskie.md` | CEO relationship context |

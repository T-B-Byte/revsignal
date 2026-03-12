# CLAUDE.md — RevSignal

> *Where signals become revenue.*

RevSignal is a personal DaaS sales command center built for a solo sales leader building a B2B data licensing business from scratch. It tracks pipeline, ingests communications, manages follow-ups, runs AI agents, and coaches the user through a complete go-to-market playbook — all aimed at a $1M first-year revenue target.

**This is not a generic CRM.** This is a purpose-built revenue weapon with an AI brain (The Strategist) that proactively finds deals, prevents forgotten follow-ups, and coaches go-to-market execution.

---

## Build & Development Commands

```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Production build
npm run lint         # Run ESLint
npx tsc --noEmit     # Type check without emitting
```

**Seed scripts:**
```bash
npm run seed                        # Seed all initial data (ICPs, competitors, playbook)
npm run seed:dry-run                # Preview seed without writing
npm run seed:competitors            # Seed competitive intelligence only
npm run seed:icps                   # Seed ICP categories and example companies
npm run seed:playbook               # Seed GTM playbook checklist items
```

**Running custom scripts:** Scripts in `/scripts/` are excluded from tsconfig. Run them with:
```bash
npx tsx scripts/your-script.ts
```

---

## Architecture Overview

**Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Supabase, Anthropic Claude Sonnet 4.6, Stripe, SendGrid

### Route Groups
- `app/(auth)/` — Login, signup, password reset, Microsoft SSO
- `app/(dashboard)/` — Protected user dashboard (revenue tracker, pipeline, follow-ups, briefings)
- `app/(dashboard)/deals/` — Deal management, deal detail, conversation history
- `app/(dashboard)/prospects/` — Prospect engine, ICP browser, research results
- `app/(dashboard)/playbook/` — GTM playbook tracker, 30-60-90 plan
- `app/(dashboard)/compete/` — Competitive intelligence, battle cards
- `app/(dashboard)/compose/` — Email/message composer, sequence builder
- `app/(dashboard)/marketing/` — Marketing command center, skill triggers, campaign tracker
- `app/(dashboard)/settings/` — Integrations, MCP status, notification preferences
- `app/(marketing)/` — Public pages (home, pricing, product tour) — for future productization
- `app/admin/` — Admin panel (user management, subscription analytics)
- `app/api/` — API routes
- `app/api/agents/` — Agent orchestration endpoints (Master Agent, sub-agents)
- `app/api/ingest/` — Data ingestion endpoints (Teams, Outlook, SFDC, call transcripts)
- `app/api/webhooks/` — Webhook receivers (Stripe, Microsoft Graph, Salesforce)
- `app/api/cron/` — Scheduled jobs (briefings, sync, research sweeps)

### Middleware (`middleware.ts`)
- **Token capture**: Captures `?token=TOKEN` params into cookies for deferred actions (e.g., Microsoft OAuth callback).
- **Session refresh**: Calls `updateSession()` to maintain Supabase auth.
- **Integration health**: Sets headers indicating which integrations (Teams, Outlook, SFDC) are active vs. degraded for dashboard status display.

### Key Library Modules

| Path | Purpose |
|------|---------|
| `lib/supabase/` | Supabase clients (see usage guide below) |
| `lib/supabase/client.ts` | Browser client for client components |
| `lib/supabase/server.ts` | Server client respecting RLS |
| `lib/supabase/admin.ts` | Admin client bypassing RLS |
| `lib/anthropic/` | Claude Sonnet 4.6 client, agent orchestration, tool definitions |
| `lib/agents/` | Agent framework — Master Agent (The Strategist) + 6 sub-agents |
| `lib/agents/strategist.ts` | Master Agent: briefings, deal strategy, pattern recognition, playbook coaching |
| `lib/agents/prospect-scout.ts` | Prospect research and enrichment |
| `lib/agents/follow-up-enforcer.ts` | Follow-up monitoring and escalation |
| `lib/agents/call-analyst.ts` | Call transcript processing and insight extraction |
| `lib/agents/competitive-watcher.ts` | Competitor monitoring and alerts |
| `lib/agents/email-composer.ts` | Contextual email and message drafting |
| `lib/agents/sfdc-sync.ts` | Salesforce bi-directional sync |
| `lib/integrations/microsoft-graph.ts` | Teams chats, call transcripts, Outlook email/calendar, OneDrive/SharePoint |
| `lib/integrations/salesforce.ts` | SFDC REST API — accounts, contacts, opportunities, activities |
| `lib/integrations/pharosiq-data.ts` | pharosIQ contacts DB — read-only access to contacts, intent signals, sample data generation |
| `lib/integrations/linkedin.ts` | LinkedIn profile enrichment (stretch goal) |
| `lib/stripe/` | Stripe client, subscription management, webhook handlers |
| `lib/sendgrid.ts` | Transactional email (briefings, follow-up digests, alerts) |
| `lib/email-templates.ts` | HTML email template builder |
| `lib/rag/` | Retrieval-Augmented Generation — context retrieval before every AI response |
| `lib/rag/retriever.ts` | Database retrieval by deal, contact, prospect, action item |
| `lib/rag/summarizer.ts` | Summarization ladder (Raw → Summary → Deal Brief → Weekly Digest) |
| `lib/rag/conflict-detector.ts` | Flags contradictions between ingested data and existing records |
| `lib/pipeline/` | Data pipeline utilities — ingestion, processing, normalization |
| `lib/pipeline/teams-ingest.ts` | Teams chat and call recording ingestion |
| `lib/pipeline/outlook-ingest.ts` | Email and calendar ingestion |
| `lib/pipeline/sfdc-sync.ts` | Salesforce bi-directional sync logic |
| `lib/pipeline/transcript-processor.ts` | Call transcript → Claude summarization → structured data |
| `lib/pipeline/intent-csv-ingest.ts` | Weekly pharosIQ intent signals CSV parsing, normalization, and matching |
| `lib/playbook/` | GTM playbook tracking — checklist items, completion status, reminders |
| `lib/rate-limit.ts` | IP-based rate limiting for API routes |
| `lib/content/` | Marketing content data (for productization landing pages) |

### Supabase Client Usage

Choose the correct client based on context:

| Client | Import | Use When |
|--------|--------|----------|
| `createClient()` | `lib/supabase/client.ts` | Client components (`'use client'`) |
| `createClient()` | `lib/supabase/server.ts` | Server components, API routes (respects RLS) |
| `createAdminClient()` | `lib/supabase/admin.ts` | Bypassing RLS (admin operations, cron jobs, agent pipelines) |

```typescript
// ✅ Server component / API route (respects user session)
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient();

// ✅ Admin operation (bypasses RLS — agents, crons, pipelines)
import { createAdminClient } from '@/lib/supabase/admin';
const supabase = createAdminClient();

// ✅ Client component
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();
```

### Path Alias

Use `@/*` to import from project root:
```typescript
import { createClient } from '@/lib/supabase/server';
import { DealCard } from '@/components/dashboard/DealCard';
import { retrieveDealContext } from '@/lib/rag/retriever';
```

---

## Agent Architecture

RevSignal's AI brain is a multi-agent system powered by Claude Sonnet 4.6 (`claude-sonnet-4-6`) via the Anthropic SDK with tool use.

### The Master Agent: "The Strategist"

The Strategist is the most important component in the app. It is not a passive tool — it is an always-on strategist that proactively drives revenue.

**Key responsibilities:**
- Daily morning briefings (top 3 priorities, prospect suggestions, pipeline health)
- Deal strategy for every active opportunity
- Pattern recognition across all ingested data
- Revenue forecasting and pacing alerts
- Proactive idea generation (new ICPs, pricing experiments, upsell triggers)
- Weekly strategy memos (Friday)
- **GTM Playbook coaching** — tracks all 12 playbook workstreams, flags neglected items, weaves reminders into briefings

### Sub-Agents

| Agent | File | Responsibility |
|-------|------|----------------|
| Prospect Scout | `lib/agents/prospect-scout.ts` | Weekly research sweeps, new target discovery, profile enrichment |
| Follow-Up Enforcer | `lib/agents/follow-up-enforcer.ts` | Monitors all conversations for commitments, creates reminders, drafts follow-ups, escalates overdue to RED |
| Call Analyst | `lib/agents/call-analyst.ts` | Processes Teams call transcripts → summary, action items, objections, competitor mentions |
| Competitive Watcher | `lib/agents/competitive-watcher.ts` | Monitors competitor news, pricing, product changes, sentiment |
| Email Composer | `lib/agents/email-composer.ts` | Drafts all outbound communications using conversation history and user voice profile |
| SFDC Sync Agent | `lib/agents/sfdc-sync.ts` | Keeps Salesforce in sync — writes deals, logs activities, prevents double-entry |

### Agent Development Rules

- **Every agent call MUST use RAG retrieval first.** Never generate a response from context window alone. Always retrieve relevant records from the database before prompting Claude.
- **Agents access external systems through MCP servers**, not direct API wrappers (see MCP section).
- **Agent outputs must cite sources.** Every fact about a deal, contact, or conversation must reference a conversation_id, date, and channel. If no source exists, the agent says "I don't have a record of that."
- **Agents never invent data.** No fabricated pricing, dates, commitments, metrics, or contact details. Ever.
- **Each deal has its own context silo.** Agents retrieve per-deal, not globally. Never cross-contaminate deal contexts.
- **Agent processing is async.** Long-running agent tasks (research sweeps, transcript processing) run as background jobs, not blocking API requests.

---

## MCP Servers (Model Context Protocol)

MCP servers give Claude's agents direct, authenticated access to external tools. This replaces custom API wrappers.

### Required MCP Servers

| Server | Purpose | Agents That Use It |
|--------|---------|-------------------|
| **Salesforce MCP** | Read/write Accounts, Contacts, Opportunities, Activities | SFDC Sync Agent, Strategist |
| **Microsoft Graph MCP** | Teams chats, call transcripts, Outlook email/calendar, OneDrive | Follow-Up Enforcer, Call Analyst, Strategist |
| **pharosIQ Contacts DB** | Read access to pharosIQ's business contacts and intent data (270M+ contacts, 650+ intent categories) | Prospect Scout, Strategist, Email Composer |
| **Web Search MCP** | Web search for prospect research, competitive intel | Prospect Scout, Competitive Watcher |
| **File System MCP** | Local file operations: exports, cached research, reports | All agents |
| **Google Dev Tools** | GA4, Search Console, GTM (for marketing pages if productized) | Marketing workflows |

### MCP Configuration

- Store configs in `.claude/settings.json` or project-level env
- All credentials in environment variables — **never hardcoded**
- Rate limiting per API quotas
- **Graceful degradation**: If an MCP server is down, fall back to manual mode. App must never be unusable because one integration is offline.

### Integration Fallback Pattern

Every integration must implement this pattern:

```typescript
// ✅ CORRECT — always have a fallback
async function getTeamsMessages(userId: string) {
  try {
    return await mcpClient.teams.getMessages(userId);
  } catch (error) {
    logIntegrationDegraded('teams', error);
    return { source: 'manual', messages: [] }; // UI shows paste-in fallback
  }
}
```

The integration status dashboard (`/settings`) shows which connections are active, degraded, or in fallback mode.

---

## Data Pipeline & Ingestion

### Ingestion Schedule

| Source | Frequency | Endpoint | Processing |
|--------|-----------|----------|------------|
| Teams chats | Every 15 min | `api/ingest/teams-chats` | Auto-match to contacts, extract action items |
| Outlook emails | Every 15 min | `api/ingest/outlook-emails` | Auto-match to deals, extract commitments |
| Teams call recordings | Daily | `api/ingest/call-transcripts` | Transcript → Claude summarization → structured data |
| Salesforce sync | Hourly | `api/ingest/sfdc-sync` | Bi-directional: pull changes, push updates |
| pharosIQ contacts DB | On-demand + daily cache | `api/ingest/pharosiq-contacts` | Read-only: pull contact records, intent signals, sample data for demos |
| pharosIQ intent signals CSV | Weekly | `api/ingest/intent-signals-csv` | Parse weekly intent signals export, match to prospects/deals, flag surge signals, update Prospect Scout targets |
| Prospect research | Weekly (Monday) | `api/cron/prospect-sweep` | Run research via Prospect Scout agent |
| Competitive monitoring | Weekly | `api/cron/competitive-scan` | Run scan via Competitive Watcher agent |

### Summarization Ladder

Raw ingested data is progressively summarized to manage context window limits:

| Level | What | Retention | Used By |
|-------|------|-----------|---------|
| **Raw** | Full email/chat/transcript text | Stored in DB, used for search. NOT sent to Claude in full. | Search/retrieval only |
| **Summary** | 3-5 sentence AI summary per conversation | Stored in DB. This is what agents read for context. | All agents |
| **Deal Brief** | Rolling summary of entire deal history | Updated after every new conversation. Primary context for deal queries. | Strategist, Email Composer |
| **Weekly Digest** | Summary of all activity across all deals | Generated Fridays. Used for strategy memos and pattern recognition. | Strategist |

**When an agent needs context about a deal, it gets the Deal Brief (1-2 paragraphs) — NOT 50 raw emails.**

### Transcript Processing Pipeline

```
Teams call recording
  → Microsoft Graph API (pull transcript)
  → Claude Sonnet 4.6 (extract: summary, action items, objections, competitor mentions, pricing discussed)
  → Write structured data to DB (conversations, action_items, deal_briefs)
  → Notify Follow-Up Enforcer (new commitments to track)
  → Update Deal Brief (rolling summary refreshed)
```

---

## Background Job Processing

RevSignal uses Supabase Edge Functions and Next.js API routes for async processing.

### Cron Jobs

| Route | Schedule | Purpose |
|-------|----------|---------|
| `api/cron/morning-briefing` | Daily 7:00 AM | Strategist generates daily briefing |
| `api/cron/friday-memo` | Friday 4:00 PM | Strategist generates weekly strategy memo |
| `api/cron/ingest-teams` | Every 15 min | Pull Teams chats and match to contacts |
| `api/cron/ingest-outlook` | Every 15 min | Pull Outlook emails and match to deals |
| `api/cron/ingest-transcripts` | Daily 6:00 AM | Process new call recordings from previous day |
| `api/cron/sfdc-sync` | Hourly | Bi-directional Salesforce sync |
| `api/cron/prospect-sweep` | Monday 8:00 AM | Prospect Scout runs weekly research |
| `api/cron/competitive-scan` | Wednesday 8:00 AM | Competitive Watcher scans for changes |
| `api/cron/followup-escalation` | Daily 9:00 AM | Escalate overdue follow-ups to RED |
| `api/cron/playbook-check` | Friday 3:00 PM | Flag neglected playbook items (30+ days untouched) |
| `api/cron/deal-brief-refresh` | Daily 11:00 PM | Regenerate deal briefs for deals with new activity |

---

## Email System

SendGrid integration for transactional email:
- `lib/sendgrid.ts` — Core send function
- `lib/email-templates.ts` — HTML template builder with RevSignal branding
- `lib/email-components.ts` — Reusable email UI components

**Email types:**
- Morning briefing digest
- Follow-up reminder alerts (escalation)
- Weekly strategy memo
- Deal stage change notifications
- Prospect research results
- Integration status alerts

---

## Hallucination Prevention — CRITICAL

This app ingests thousands of emails, chats, transcripts, and deal notes. Claude's context window cannot hold all of it. Without strict rules, the AI will hallucinate, confuse deals, and give bad advice. **Bad advice is worse than no advice.**

### Hard Rules for All Agent Responses

1. **NEVER state a fact about a deal, contact, or conversation without citing the source record** (conversation_id, date, channel). If no source exists → "I don't have a record of that."
2. **NEVER invent pricing, dates, commitments, metrics, or contact details.** If asked "what price did I quote Apollo?" and there's no record → "I don't have a record of a price quote to Apollo." Not a guess.
3. **NEVER confuse contacts between deals.** Each deal is a context silo. Retrieve per-deal, not globally.
4. **Flag uncertainty.** If working from incomplete data (partial transcript, missing email): "Based on the partial transcript from Feb 12, it sounds like budget constraints were mentioned, but the transcript was incomplete — confirm with your notes."
5. **Timestamp everything.** Every summary, recommendation, and draft includes: when the source data was captured, when the analysis was generated, how fresh the information is.
6. **Detect and flag conflicts.** If ingested data contradicts existing records, ask the user to resolve: "You told Apollo $100K on Feb 10, but your Feb 15 email mentioned $85K. Which is current?"

### RAG-First Architecture

```
User request
  → Identify relevant entities (deal, contact, prospect)
  → Retrieve structured data from DB (Deal Brief, recent conversations, action items)
  → Construct prompt: system instructions + retrieved context + user request
  → Claude generates response grounded in retrieved facts
  → Response includes source citations
```

**The retrieval step happens BEFORE generation. Always. No exceptions.**

---

## Database Schema

### Core Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `user_profiles` | User account data | `id` (PK), `user_id` (FK to auth.users), `display_name`, `voice_profile_path` |
| `deals` | Pipeline deals | `deal_id`, `company`, `contacts[]`, `stage`, `acv`, `deployment_method`, `tier`, `created_date`, `last_activity_date`, `win_probability` |
| `contacts` | People at prospect/customer companies | `contact_id`, `company`, `name`, `role`, `email`, `linkedin`, `icp_category` |
| `conversations` | Every logged interaction | `conversation_id`, `contact_id`, `deal_id`, `date`, `channel` (teams/email/call), `raw_text`, `ai_summary`, `action_items[]`, `follow_up_date` |
| `action_items` | Commitments tracked by Follow-Up Enforcer | `item_id`, `description`, `owner` (me/them), `due_date`, `status`, `source_conversation_id`, `escalation_level` |
| `prospects` | Prospect engine targets | `company`, `icp_category`, `contacts[]`, `estimated_acv`, `research_notes`, `last_researched_date`, `source` |
| `deal_briefs` | Rolling AI summaries per deal | `deal_id`, `brief_text`, `last_updated`, `source_conversations[]` |
| `weekly_digests` | Weekly summary for Strategist | `week_start`, `digest_text`, `deals_advanced`, `deals_stalled`, `revenue_closed` |
| `competitive_intel` | Competitor data | `competitor`, `category`, `data_point`, `source`, `captured_date` |
| `playbook_items` | GTM playbook checklist | `item_id`, `workstream`, `description`, `status`, `last_touched`, `notes` |
| `ingested_messages` | Raw ingested Teams/Outlook/SFDC data | `source`, `external_id`, `raw_content`, `processed`, `matched_contact_id`, `matched_deal_id` |
| `agent_logs` | Audit trail of all agent actions | `agent_name`, `action`, `input_context`, `output`, `timestamp`, `sources_cited[]` |
| `subscriptions` | Stripe subscription data | `user_id`, `stripe_customer_id`, `tier`, `status`, `current_period_end` |

**CRITICAL: `user_profiles` has TWO UUID columns:**

| Column | Purpose |
|--------|---------|
| `id` | Auto-generated primary key |
| `user_id` | Foreign key to `auth.users.id` |

**Always query by `user_id` when looking up by auth user:**
```typescript
// ✅ CORRECT
.from('user_profiles').eq('user_id', authUserId)

// ❌ WRONG — id is the profile's own PK
.from('user_profiles').eq('id', authUserId)
```

This pattern applies to all user-centric tables (`deals`, `conversations`, `subscriptions`, etc.).

---

## Stripe Payment Tiers

Build Stripe integration from day one — even if there's only one user initially, this app may become a product.

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0 | Dashboard, 3 active deals, manual conversation logging, basic follow-up reminders |
| **Starter** | $49/mo | Unlimited deals, Microsoft + SFDC integration, email composer, prospect engine (10 searches/mo) |
| **Power** | $149/mo | Everything + Strategist daily briefings, call transcript processing, weekly strategy memos, unlimited prospect research, marketing skill integrations, playbook coaching |

---

## Vibe Marketing Skills Integration

RevSignal integrates with system-level marketing automation skills. These are triggered from the Marketing Command section in the UI.

| Skill | Use In RevSignal |
|-------|-----------------|
| `/positioning-angles` | Generate positioning angles for DaaS product. Save to `./brand/positioning.md`. |
| `/brand-voice` | Extract selling voice from outreach emails. Save to `./brand/voice-profile.md`. |
| `/direct-response-copy` | Sales collateral: cold emails, one-pagers, pitch deck messaging, landing pages. |
| `/email-sequences` | Nurture sequences by pipeline stage. Output to `./campaigns/{name}/emails/`. |
| `/lead-magnet` | Top-of-funnel content: "State of Intent Data 2026," buyer's guides. |
| `/content-atomizer` | Repurpose content across LinkedIn, X, and other channels. |
| `/keyword-research` | SEO keyword research for DaaS content marketing. |
| `/seo-content` | Blog posts and articles that rank for intent data keywords. |
| `/newsletter` | "The DaaS Signal" — biweekly industry newsletter. |
| `/creative` | Visual assets: social graphics, pitch deck slides, comparison infographics. |
| `/award-winning-design` | App UI design. Premium, dark mode, glassmorphism, mission control aesthetic. |
| `/orchestrator` | Multi-step marketing campaigns (launch sequence, content blitz). |

The Strategist should proactively suggest when to use a skill based on pipeline stage and activity patterns.

---

## Workflow Process

1. **Think first.** Read relevant files and reason about the problem before changes.
2. **Create or update `tasks/todo.md`.** Write a clear plan with actionable TODO items and checkboxes.
3. **Wait for approval.** Do not code until the plan is reviewed.
4. **Execute gradually.** Complete TODOs one at a time, marking them complete.
5. **Explain changes.** After each task, explain what changed, why, and what files were affected.
6. **Prefer simplicity.** Smallest possible changes, fewest files, minimal complexity.
7. **Write a review section.** Summarize what was done and any implications.
8. **Use background agents for parallel work.** Spawn agents for independent components (e.g., building the SFDC integration while designing the dashboard).
9. **Always commit and push.** After completing work, commit the changes and push to remote. Do not wait to be asked.

---

## Engineering Standards

- **Never apply band-aid fixes.** Find and correct root causes.
- **Minimal-impact changes only.** Only modify code necessary for the task.
- **Avoid broad refactors** unless explicitly approved.
- **Agent outputs are never trusted blindly.** Every agent response is grounded in retrieved data with source citations. If an agent can't cite a source, it doesn't state the fact.
- **Integration failures are expected.** Every external integration (Teams, Outlook, SFDC) must have a manual fallback. The app is never unusable because one API is down.
- **Pipeline stages are sacred.** Deal stage transitions must be explicit user actions or confirmed by the user — agents can suggest, but never auto-advance a deal stage without confirmation.

---

## Tina's Voice & Tone

When drafting emails, outreach, proposals, or any communication on Tina's behalf, follow these rules. These are patterns observed from real editing sessions — not guesses.

**Lead with the point, not the setup.**
- No "Here's why I'm telling you this:" — just say it
- No "I wanted to reach out because..." — just reach out
- No throat-clearing. If the sentence explains that you're about to explain something, cut it.

**Never sound defensive or apologetic.**
- "I'm not asking for anything special" → sounds like you're expecting a no. Cut it entirely.
- "Just" is a minimizer. "I just need..." weakens the ask. State what you need.
- Don't justify the ask before making it. State it with confidence.

**Never imply the existing team hasn't done something.**
- "Nobody inside the building has done this before" → puts down the team
- "Every dollar of DaaS is worth more than a dollar of services" → devalues the core business
- Frame your work as **additive** ("diversifies the revenue mix and lifts the whole company"), not comparative

**Don't teach people what they already know.**
- Don't explain valuation multiples to a finance CEO
- Don't explain data licensing to a data company
- Let the reader connect the dots — it's more powerful when they do the math themselves

**Concise beats verbose.**
- "On my own time, not yours" beats "on my own time (nights and weekends)"
- "No forgotten follow-ups" beats "no more forgotten follow-ups" ("no more" implies a past problem)
- If a sentence can lose 3 words without changing the meaning, lose them

**Don't create unnecessary paper trails.**
- Don't name specific target companies in emails (say "platforms that embed our data" not "Demandbase, HubSpot")
- Don't put compensation numbers in emails that aren't about comp negotiation
- Don't reference board-level or insider information in writing. Ever.

**Warm, professional, direct.**
- Tina builds relationships, she doesn't hard-sell
- Confident without being arrogant
- Specific without being verbose
- The tone is a smart peer talking to another smart peer — not pitching up or down

---

## AI Content & Data Ethics

**TRUTH IS PARAMOUNT.** RevSignal handles real deal data, real pricing, and real customer conversations. Fabrication destroys trust and deals.

When generating content based on ingested data, **never fabricate:**
- Pricing, quotes, or financial figures not in source records
- Dates, commitments, or deadlines not in source records
- Contact details, job titles, or company information not in source records
- Metrics, percentages, or performance data not in source records
- Conversation summaries that include details not in the transcript/email

**Allowed:** Rephrasing for clarity, reordering information for impact, highlighting key points, suggesting next actions based on patterns, drafting emails in the user's voice.

**When uncertain:** Say so. "Based on incomplete data..." or "I don't have a record of that" is always better than a confident wrong answer.

---

## Documentation Requirements

When adding features:
1. Update `README.md` (Core Features or Coming Soon)
2. Update `APP_DOCUMENTATION.md` (functionality, API routes, database tables, agent behaviors)
3. Add JSDoc comments to new functions
4. **Agent behaviors must be documented:** If adding or modifying an agent, update the agent's file header with its responsibilities, trigger conditions, and output format.

---

## SEO Requirements (For Productization Pages)

When RevSignal has public-facing marketing pages:

1. Add URL to `app/sitemap.ts`
2. Create `layout.tsx` with full metadata (title, description, keywords, canonical, openGraph, twitter)
3. Add JSON-LD schema where applicable
4. Internal/external linking (pillar-cluster strategy)

### Content (Blog, Guides)

For content in `app/(marketing)/content/[slug]/`:
1. Follow all SEO requirements above
2. Add entry to `lib/content/data.ts`
3. **Hero image required** — provide prompt for generation
4. **Submit for indexing** after publishing (Google Search Console + Bing Webmaster Tools)

---

## Proactive Guidance

If you notice a faster/better approach: **stop and tell me.** Don't go along with inefficient methods.

### Bug Fixes: Prove It Pattern

When given a bug or error report, the first step is to spawn a subagent to write a test that reproduces the issue. Only proceed once reproduction is confirmed.

**Test level hierarchy** — Reproduce at the lowest level that can capture the bug:
1. **Unit test** — Pure logic bugs, isolated functions (lives next to the code)
2. **Integration test** — Component interactions, API boundaries (lives next to the code)
3. **E2E spec test** — Full user flows, browser-dependent behavior (lives in `app/specs/`)

**For every bug fix:**
1. **Reproduce with subagent** — Spawn a subagent to write a test that demonstrates the bug. The test should fail before the fix.
2. **Fix** — Implement the fix.
3. **Confirm** — The test now passes, proving the fix works.

If the bug is truly environment-specific or transient, document why a test isn't feasible rather than skipping silently.

---

## Key Reference Files

| File | Purpose |
|------|---------|
| `prompt-daas-sales-app.md` | Full app specification — modules, agents, integrations, competitive data, math |
| `daas-gtm-playbook.md` | Complete GTM playbook (12 workstreams) — the Strategist's coaching curriculum |
| `call-prep-jeff-rokuskie.md` | CEO relationship context |
| `market-assessment-prompt-template.md` | Reusable market assessment template |
| `market-assessment-metadata-io.md` | Metadata.io competitive assessment prompt |
| `prompt-chris-piggott-intro.md` | Investment banker intro email prompt |

---

## Annual Maintenance (January)

- Update year in marketing page titles
- Update `datePublished`/`dateModified` in Article schemas
- Review competitive intelligence seed data for accuracy
- Refresh GTM playbook items for new year priorities
- Review Stripe pricing tiers against market

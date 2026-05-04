# PROJECT PROMPT — REVSIGNAL: WHERE SIGNALS BECOME REVENUE
# Copy everything below this line into a new Claude Code project session.

---

# Build me **RevSignal** — a personal DaaS sales command center designed for one specific job: helping me build and close a brand-new DaaS (Data as a Service) revenue line at a B2B intent data company called pharosIQ.

This isn't a generic CRM. This is a purpose-built weapon for a solo sales leader building a data licensing business from scratch, with a $1M first-year revenue target.

---

## WHO I AM

I'm Tina. I'm joining pharosIQ as SVP, Data Monetization & Partnerships in March 2026. My job is to take their proprietary first-party intent data — which currently powers their managed services business — and monetize it as a standalone data product across the B2B martech ecosystem.

**My background:**
- Co-founded KickFire, a first-party IP-to-company intent data company
- Built KickFire's entire data monetization engine from zero — ICPs, packaging, deployment methods (API, flat file, platform integrations), pricing, and front-line sales
- Sold data across the martech ecosystem to ABM platforms, sales intelligence tools, CRMs, and ad tech companies
- Led the company through its acquisition by IDG (International Data Group, now Foundry/Foundryco.com) for $12.8M at a 3x revenue multiple
- MRP (now pharosIQ) was a KickFire customer — I have existing relationships inside the company

**My strengths:** GTM strategy, value proposition development, data packaging and pricing, ecosystem sales, relationship selling, positioning for acquisition.

**My weakness:** I historically forget to follow up with prospects. I need the app to be aggressive about reminding me and even drafting follow-up messages for me.

---

## THE COMPANY: PHAROSIQ

**What they do:** pharosIQ is a B2B intent data company formed from the merger of MRP + CONTENTgine (March 2024). They provide first-party, permission-based, contact-level intent signals through an owned content engagement ecosystem (expert-led newsletters, curated content library of 500K+ assets, 133M+ professional contacts).

**Key product:** atlasIQ Intelligence Engine — their platform for buyer intelligence and audience activation.

**Current business model:** Managed services (IQsyndicate, IQconnect, IQconvert, IQengage, IQdirect, IQappend, IQevents). They sell campaign execution and lead generation services powered by their intent data.

**What they DON'T have yet (my job):** A DaaS product — standalone data licensing where companies buy the raw intent signals via API, flat file, or platform integration. This is the new revenue line I'm building.

**The data asset:**
- First-party, permission-based engagement signals (not scraped, not third-party co-op)
- Contact-level intent (identifies WHO is engaging, not just which company)
- 125.3M contacts (last 90 days) across 25M+ global companies
- 8,756 product intent categories
- Rooftop-level geographic precision
- Down-funnel buying signals (content consumption, newsletter engagement)

**Company financials:**
- ~$60M revenue, growing 15% YoY
- $11M profit, no debt
- ~1,373 employees across 6 continents
- Ownership: Gurdeep "Singh" Chimni (Chairman, 51%) + TA Associates (49%)

**My team:**
- Jeff Rokuskie — CEO (finance background, ex-Merck, values P&L impact and enterprise value creation)
- Ben Luck — Chief Data Scientist (my champion, the data brain, will send me the data dictionary)
- Marty Fettig — EVP Sales (owns existing managed services sales, ex-Ziff Davis — my lane is separate from his)
- Chris Vriavas — Chief Strategy Officer (ex-Ziff Davis B2B, founding member, product/strategy thinker)

---

## MY COMPENSATION & TARGETS

| Component | Amount |
|---|---|
| Base salary | $225K |
| Rev-share | 25% of net new DaaS revenue, uncapped |
| OTE | $450K (at $900K in DaaS revenue) |
| Year 1 stretch goal | **$1M in DaaS revenue = $250K rev-share = $475K total** |
| Phantom equity | 0.25-0.5% (based on valuation <$150M) |

**To hit $1M in Year 1, I need 10 customers at $100K average ACV** (or fewer larger deals).

---

## WHAT THE APP NEEDS TO DO

### 1. DASHBOARD — Revenue Command Center

The home screen. At a glance I should see:

- **Revenue tracker** — Closed revenue vs. $1M goal, pacing (am I on track?), monthly/quarterly breakdown
- **Pipeline** — All active deals by stage (Lead → Discovery → Proposal → Negotiation → Closed), total pipeline value, weighted pipeline
- **Follow-up alerts** — RED: overdue follow-ups. YELLOW: follow-ups due today. GREEN: on track.
- **Activity metrics** — Emails sent, meetings held, proposals out, deals closed this week/month/quarter
- **Days since last contact** for every prospect — anything over 5 business days should flash red
- **30-60-90 day plan progress** — Where am I in the onboarding plan? What's next?

### 2. PROSPECT ENGINE — Find Me Buyers

This is where the app earns its keep. It should actively find companies that would buy pharosIQ's intent data.

**Target buyer profiles (ICPs):**

| ICP | Why They'd Buy | Example Companies | Deal Size |
|---|---|---|---|
| ABM platforms | Need intent signals to power account targeting | Demandbase, RollWorks, Terminus, N.Rich, Triblio | $200-500K |
| Sales intelligence tools | Need intent data to enrich their contact databases | Apollo, Cognism, Lusha, LeadIQ, Seamless.ai | $100-300K |
| CRM/MAP platforms | Want native intent data as a feature | HubSpot, Salesforce (AppExchange), Marketo | $500K-$2M (OEM) |
| Ad tech / DSPs | Need intent audiences for B2B programmatic targeting | The Trade Desk, StackAdapt, RollWorks | $100-250K |
| Data enrichment companies | Want to add intent signals to their enrichment offering | Clearbit/Breeze, ZoomInfo, Dun & Bradstreet | $200-500K |
| Content syndication vendors | Need better targeting signals for lead gen campaigns | NetLine, TechTarget (ironic), Madison Logic | $100-200K |
| Conversation intelligence | Could use intent data to prioritize which calls matter | Gong, Chorus, Clari | $100-200K |
| Recruiting/HR tech | Buyer intent signals could identify companies that are hiring/growing | LinkedIn, Indeed, ZipRecruiter | $100-300K |
| Financial services / investors | Intent data as alternative data for investment signals | Bloomberg, S&P, hedge funds | $200-500K |

**How the Prospect Engine works:**
- Use the `/last30days`, `/last14days`, and `/last7days` skills to scan Reddit, X, and the web for:
  - Companies publicly looking for intent data providers
  - Companies complaining about their current intent data quality (Bombora skepticism, 6sense frustrations)
  - New startups in the B2B data/martech space that might need data partnerships
  - Job postings for "data partnerships" or "intent data" roles (signals a company is building this capability)
  - Industry news about companies raising funding (newly funded companies buy data tools)
- Maintain a **prospect database** with: company name, ICP category, key contact(s), estimated deal size, why they'd buy, last research date
- Refresh research weekly — surface new prospects every Monday
- **Think beyond the obvious.** Explore unconventional verticals: insurance, real estate tech, automotive, healthcare — any industry where knowing "which companies are researching what" has value. The data isn't just for martech.

### 3. CONVERSATION TRACKER — Never Forget a Follow-Up

This is my biggest weakness. The app needs to be my external memory for every prospect and internal relationship.

**For each contact/deal, track:**
- Company name, contact name(s), role(s), email(s)
- Deal stage (Lead → Discovery → Proposal → Negotiation → Closed Won/Lost)
- Estimated ACV
- Every conversation (date, channel, summary, key takeaways, next steps)
- Promised follow-up date
- **Auto-generated follow-up reminders** — if I logged a conversation and said "I'll send the pricing doc by Friday," the app should remind me Thursday and draft the email

**Follow-up automation:**
- After every logged conversation, the app should ask: "What's the next step? When?" and set the reminder automatically
- If a deal goes 5+ business days without activity, escalate to RED alert on dashboard
- If a deal goes 10+ business days, draft a "just checking in" email for me to review and send
- For each follow-up, **draft the actual email** based on the conversation history — not a generic template, but a contextual message that references what we last discussed

**Internal conversations too:**
- Track conversations with Jeff, Ben, Marty, Chris
- Track action items from internal meetings
- Track requests I've made (e.g., "asked Ben for data dictionary" — is it done?)

### 4. GTM WORKBENCH — Positioning, Pricing & Competitive Intel

A living workspace for building the DaaS go-to-market:

**Product Positioning:**
- pharosIQ's data differentiators vs. competitors (Bombora, 6sense, TechTarget, Intentsify, ZoomInfo)
- Value proposition by ICP (what matters to an ABM platform is different from what matters to a sales intel tool)
- Elevator pitches — 15-second, 30-second, 2-minute versions
- Objection handling playbook (common pushback and how to respond)

**Competitive Intelligence:**
- Competitor pricing (what Bombora charges, what ZoomInfo charges, etc.)
- Competitor weaknesses to exploit (Bombora = third-party co-op, account-level only; 6sense = expensive, layoffs, toxic culture; TechTarget = declining revenue, impairment charges; ZoomInfo = commoditizing, flat growth)
- Win/loss tracking — why did we win or lose each deal? Pattern recognition over time.

**Pricing Models:**
- Per-record pricing
- Per-seat licensing
- API call-based pricing
- Flat-file monthly/quarterly delivery
- OEM/white-label licensing tiers
- The app should help me model different pricing scenarios: "If I charge $X per record with Y records per month, that's $Z ACV"

**Deployment Methods:**
- API (real-time)
- Flat file (SFTP, scheduled delivery)
- Platform integration (native connectors)
- Data enrichment (append to existing records)
- Embedded/OEM (white-label within another product)

### 5. THE 30-60-90 DAY PLAN — Guided Onboarding

The app should have a structured onboarding plan that guides me through the first 90 days:

**Days 1-30 (March 2026): LEARN**
- Sign NDA, get system access
- Review data dictionary from Ben — understand every field, signal type, and category
- Map the full data asset: what do we have, how fresh is it, what's the volume, what's the quality?
- Interview Ben, Chris, and Marty about current customers and use cases
- Identify 3-5 "quick win" data products that can be packaged fast
- Research competitor pricing and packaging (Bombora, ZoomInfo data licensing, TechTarget Priority Engine)
- Build initial pitch deck and one-pager
- Identify first 20 target accounts from personal network + prospect engine

**Days 31-60 (April 2026): BUILD**
- Finalize DaaS product packaging (3 tiers: Signals, Intelligence, Embedded)
- Set pricing for each tier and deployment method
- Build sales collateral: pitch deck, one-pager, ROI calculator, sample data
- Begin outreach to first 20 target accounts
- Schedule 10-15 discovery calls
- Present GTM plan to Jeff and the leadership team
- Jeff wants to report sales in Q2 — need at least pipeline to show

**Days 61-90 (May-June 2026): SELL**
- Close first 1-3 deals
- Build case studies from early customers
- Refine pricing based on market feedback
- Expand prospect list to 50+ accounts
- Begin platform/OEM conversations with 2-3 large targets
- Q2 board reporting: show revenue, pipeline, and trajectory

### 6. INDUSTRY EXPLORER — Think Bigger

A dedicated space for brainstorming non-obvious use cases for pharosIQ's data:

- **What industries beyond martech could use contact-level intent data?**
- The app should periodically research and suggest new verticals
- For each vertical, model: potential market size, likely buyers, estimated ACV, level of effort to enter
- Examples to seed: insurance (carrier intent), fintech (alternative data for investors), recruiting (company growth signals), commercial real estate (tenant intent), cybersecurity (companies researching security tools = they have a problem)

### 7. EMAIL & MESSAGE COMPOSER — Draft Everything for Me

Using Claude Sonnet 4.6:
- Draft cold outreach emails based on prospect profile and ICP
- Draft follow-up emails based on conversation history
- Draft proposals and pricing summaries
- Draft internal updates to Jeff (weekly revenue report)
- Draft LinkedIn connection messages and InMail
- All drafts should match my voice: professional, confident, direct, warm but not salesy. I build relationships, I don't hard-sell.
- Output should be ready to copy/paste into Outlook, LinkedIn, or CRM

### 8. INTEGRATIONS — The Nervous System

This app needs to be wired into everything I use. Build real integrations, not just copy/paste. pharosIQ uses Microsoft 365 and Salesforce.

**Microsoft Teams (PRIMARY — this is where all internal communication happens):**
- **Ingest ALL my Teams chats** — the app should read and index every message I send and receive in Teams. Use this to:
  - Auto-log internal conversations with Jeff, Ben, Marty, Chris into the conversation tracker
  - Detect action items and commitments ("I'll send that by Friday" → auto-create follow-up reminder)
  - Surface context before meetings ("You last talked to Ben about the data dictionary 3 days ago, he hasn't sent it yet")
  - Track promises made to me by others (e.g., "Ben said he'd send the data dictionary" → remind ME to follow up with BEN if he hasn't)
- **Ingest call recordings** — Teams records calls. The app should:
  - Pull call recordings and transcripts automatically
  - Summarize each call: key discussion points, decisions made, action items, next steps
  - Auto-log the summary into the conversation tracker under the right deal/contact
  - Extract any pricing discussions, objections raised, or competitor mentions for the GTM Workbench
  - Flag follow-up commitments and set reminders
- **Post to Teams** — Send me reminders, daily briefings, and alerts directly in Teams so I see them where I already live
- Use Microsoft Graph API for Teams integration

**Microsoft Outlook:**
- **Read all my emails** — index incoming and outgoing emails, auto-match to deals/contacts in the pipeline
- **Send emails** — compose in the app, send through Outlook (so it appears in my Sent folder and the recipient sees my real email address)
- **Calendar integration** — pull my calendar to show upcoming meetings on the dashboard, auto-prep me with context before each meeting ("Meeting with Apollo.io in 30 min — here's the deal history, last conversation, and suggested talking points")
- Use Microsoft Graph API for Outlook/Calendar

**Salesforce CRM (assume SFDC):**
- **Read from SFDC** — pull existing accounts, contacts, opportunities, and activity history. Don't duplicate what's already there.
- **Write to SFDC** — when I log a conversation or move a deal stage in my app, sync it to Salesforce automatically. Jeff and the team should see my pipeline in their CRM without me having to double-enter anything.
- **Bi-directional sync** — if someone else updates a record in SFDC (e.g., Marty adds a note on a shared account), my app should reflect that
- **Create new opportunities** in SFDC when I advance a prospect to "Discovery" stage in my app
- **Log activities** — every call, email, and meeting should appear as an Activity in SFDC under the right Contact/Opportunity
- Use Salesforce REST API (or Bulk API for initial data load)

**pharosIQ Business Contacts Database (CRITICAL — this is the product I'm selling):**
- **Read access to pharosIQ's contact and intent data store** — the 125.3M contacts (last 90 days), 8,756 intent categories, and engagement signals that make up the DaaS product
- Use this to:
  - Build sample data files for prospects (e.g., "Here's 500 contacts showing IT decision-makers at mid-market companies researching cybersecurity tools")
  - Understand exactly what data fields, signal types, and categories are available so I can sell accurately
  - Tailor live demos to each prospect's use case (pull real data matching their ICP)
  - Validate data freshness and quality claims before making them to buyers
  - Feed the Prospect Scout agent with real signals (e.g., "Which companies in our data are showing surge intent for ABM platforms?" — those companies might BE buyers of our data)
- **Read-only access.** I don't need to write to the production database. Just query it.
- Work with Ben Luck (Chief Data Scientist) on the connection method — likely a read replica, API endpoint, or direct DB read access
- Cache frequently-used queries and sample sets locally so I'm not hammering production
- **Weekly intent signals CSV ingestion** — pharosIQ will provide a weekly CSV export of intent signals (companies showing surge activity, topic categories, contact-level engagement). The app should:
  - Ingest and parse the CSV automatically (upload or pull from shared drive)
  - Match intent signals against existing prospects and deals in the pipeline ("Apollo.io is showing surge intent for 'sales intelligence' — you have an active deal with them")
  - Flag new companies showing relevant intent that aren't in the pipeline yet — feed these to the Prospect Scout
  - Track signal trends week over week ("Demandbase intent for 'data enrichment' has spiked 3 weeks in a row")
  - Use signals to prioritize outreach: high-intent companies get contacted first

**OneDrive/SharePoint:**
- Store and access sales collateral (pitch decks, one-pagers, pricing docs, sample data files)
- When I'm drafting a proposal in the app, it should be able to pull the latest version of my pitch deck from SharePoint
- Use Microsoft Graph API

**LinkedIn (stretch goal):**
- Pull prospect profile data for context enrichment
- Draft and queue LinkedIn connection requests and InMail
- If full API isn't available, build a browser-extension-style workflow

**Integration Architecture:**
- Build a unified **Activity Feed** that merges signals from all sources: Teams chats, Outlook emails, SFDC updates, call recordings — all in one chronological stream per deal/contact
- Every integration should have a **fallback to copy/paste** if API access gets blocked by IT. The app should never be unusable just because one integration is down.
- Build an **integration status dashboard** showing which connections are active, which are degraded, and which are in copy/paste fallback mode

---

## TECH STACK (MANDATORY)

Use this exact stack. Do not substitute or "simplify."

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 App Router with TypeScript |
| **Database & Auth** | Supabase (PostgreSQL with Row Level Security, Supabase Auth) |
| **Payments** | Stripe (subscriptions with tiers: Free, Starter, Power) |
| **Transactional Email** | SendGrid |
| **Styling** | Tailwind CSS with dark/light theme support |
| **AI Model** | Claude Sonnet 4.6 (`claude-sonnet-4-6`) via Anthropic SDK |
| **Hosting** | Vercel (Next.js native) |

### Payment Tiers (for future productization)

Build Stripe integration from day one — even if I'm the only user initially, this app may become a product I sell to other data sales leaders.

| Tier | Price | Features |
|---|---|---|
| **Free** | $0 | Dashboard, 3 active deals, manual conversation logging, basic follow-up reminders |
| **Starter** | $49/mo | Unlimited deals, Microsoft + SFDC integration, email composer, prospect engine (10 searches/mo) |
| **Power** | $149/mo | Everything + Master Agent daily briefings, call transcript processing, weekly strategy memos, unlimited prospect research, marketing skill integrations |

---

## MCP SERVERS (Model Context Protocol)

Use MCP servers to give Claude direct, authenticated access to external tools. This is how we avoid hacky API wrappers and give the AI agent native tool access.

### Required MCP Servers

**Salesforce MCP Server**
- Give Claude direct read/write access to SFDC: Accounts, Contacts, Opportunities, Activities, Reports
- The Master Agent and SFDC Sync Agent should call Salesforce tools natively through MCP rather than going through a REST API wrapper
- Search for existing community MCP servers for Salesforce (e.g., `@modelcontextprotocol/server-salesforce` or equivalent). If none exist, build one using the Salesforce REST API.

**Microsoft Graph MCP Server**
- Give Claude direct access to Teams (chats, call transcripts), Outlook (email read/send, calendar), OneDrive/SharePoint (files)
- The Follow-Up Enforcer and Call Analyst sub-agents should read from Teams natively through MCP
- Search for existing community MCP servers for Microsoft Graph. If none exist, build one using the Microsoft Graph API.

**Google Dev Tools**
- **Google Analytics (GA4)** — If we build a public-facing landing page or content for the DaaS product, track visitor behavior. Use the Google Analytics Data API via MCP or direct integration.
- **Google Search Console** — Monitor SEO performance of any DaaS marketing content we publish. Useful when the marketing skills generate blog posts or landing pages.
- **Google Tag Manager** — Manage tracking tags on any marketing pages without code changes.
- **Chrome DevTools Protocol** — If we build a browser extension for LinkedIn prospecting or email tracking, use CDP for browser automation.

**Web Search / Browsing MCP Server**
- For the Prospect Scout and Competitive Watcher sub-agents to search the web, scrape company pages, and pull market intelligence
- Use an existing web search MCP server or build one that wraps a search API

**File System MCP Server**
- For reading/writing local files: exported reports, downloaded transcripts, cached research results
- Use the standard `@modelcontextprotocol/server-filesystem`

### MCP Configuration

Store MCP server configs in the project's `.claude/settings.json` or equivalent. Each server should have:
- Authentication credentials (stored in environment variables, never hardcoded)
- Rate limiting appropriate to each API's quotas
- Error handling with graceful degradation (if an MCP server is down, fall back to manual mode)

---

## VIBE MARKETING SKILLS INTEGRATION

I have a set of marketing automation skills available at the system level. These are powerful and should be wired into the app's workflows. Use them — don't rebuild what already exists.

### Skills to Integrate

| Skill | How It's Used in This App |
|---|---|
| **`/positioning-angles`** | Run this FIRST during the 30-60-90 onboarding. Feed it pharosIQ's data asset and competitor landscape. Generate 3-5 positioning angles for the DaaS product. Star the winner. Save to `./brand/positioning.md`. Every email, pitch, and proposal the app generates should reference this positioning. |
| **`/brand-voice`** | Extract my selling voice from my outreach emails and conversation logs. Build a voice profile so the Email Composer and Master Agent always sound like me, not generic AI. Save to `./brand/voice-profile.md`. |
| **`/direct-response-copy`** | Use for ALL sales collateral: cold outreach emails, follow-up sequences, landing page copy for the DaaS product, one-pagers, pitch deck messaging. Score copy on conversion dimensions. Generate A/B variants. |
| **`/email-sequences`** | Build automated nurture sequences for prospects at each pipeline stage: post-discovery drip, post-proposal follow-up, re-engagement for stalled deals, post-close onboarding. Output to `./campaigns/{sequence-name}/emails/`. |
| **`/lead-magnet`** | Create top-of-funnel content that attracts DaaS buyers: "The State of B2B Intent Data 2026" report, "Intent Data Buyer's Guide," "First-Party vs. Third-Party: What Actually Works." Use these to generate inbound leads alongside outbound sales. |
| **`/content-atomizer`** | Take any content we create (lead magnets, case studies, blog posts) and atomize it across LinkedIn, X, and other channels. I should be visible in the market as the DaaS expert, not just cold-calling. |
| **`/keyword-research`** | Research what terms DaaS buyers are searching for: "B2B intent data providers," "first-party intent data," "contact-level intent," "Bombora alternatives." Build a content plan that captures inbound demand. |
| **`/seo-content`** | Write blog posts and articles that rank for the keywords above. Publish on pharosIQ's blog or a personal thought leadership site. Every article is a lead gen machine. |
| **`/newsletter`** | Create a weekly or biweekly newsletter: "The DaaS Signal" — positioning me as the industry expert on B2B data monetization. Build an audience of potential buyers. |
| **`/creative`** | Generate visual assets: social graphics, pitch deck slides, infographics comparing pharosIQ vs. competitors, data visualization mockups for sales demos. |
| **`/award-winning-design`** | Use for the app's UI itself. The dashboard should be premium, interactive, and feel like a real product — not a hackathon project. Dark mode, glassmorphism, fluid motion, distinctive typography. Also use for any public-facing DaaS landing pages. |
| **`/last30days`** | Already integrated as the Prospect Scout's research engine. Also use for competitive monitoring and industry trend detection. |
| **`/orchestrator`** | When I need a multi-step marketing campaign (e.g., "launch the DaaS product publicly"), use the orchestrator to sequence the right skills: positioning → copy → landing page → email sequence → content atomization → SEO. |

### How Skills Connect to the App

The app should have a **Marketing Command** section in the UI that:
- Shows which brand assets exist (voice profile, positioning, keyword plan)
- Lets me trigger any skill from a button ("Generate new outreach sequence" → runs `/email-sequences`)
- Tracks campaigns in progress and their performance
- Stores all generated content in organized directories: `./brand/`, `./campaigns/`, `./content/`

The Master Agent should proactively suggest when to use a skill:
- "You've closed 3 deals. Want me to run `/lead-magnet` to create a case study that generates inbound leads?"
- "Your LinkedIn presence is low. Want me to run `/content-atomizer` on your latest blog post?"
- "The 'Bombora alternatives' keyword has 2,400 monthly searches. Want me to run `/seo-content` to write a ranking article?"

---

## TECHNICAL REQUIREMENTS

- **AI Model:** Claude Sonnet 4.6 (`claude-sonnet-4-6`) for all reasoning, drafting, research synthesis, prospect analysis, call transcript summarization, and email/chat parsing. This is the brain of the app. Use the Anthropic SDK with tool use for agent orchestration.
- **MCP Servers:** Salesforce, Microsoft Graph, Web Search, File System. Configure in project settings. Each agent accesses external tools natively through MCP.
- **Web research:** Use `/last30days`, `/last14days`, `/last7days` skills for prospect research and competitive intelligence. Supplement with web search MCP server for real-time lookups.
- **Database:** Supabase (PostgreSQL with RLS). Schema must handle: deals, contacts, conversations, action items, prospects, ingested communications, campaign assets, marketing content. Row Level Security ensures only authenticated user sees their data.
- **Auth:** Supabase Auth. Support email/password and Microsoft SSO (since pharosIQ uses M365).
- **APIs via MCP:**
  - **Microsoft Graph** — Teams chats, call recordings/transcripts, Outlook email read/send, Calendar, OneDrive/SharePoint
  - **Salesforce** — Accounts, Contacts, Opportunities, Activities (CRUD + reporting)
  - **pharosIQ Contacts DB** — Read-only access to business contacts, intent signals, and engagement data (the product being sold)
  - **Claude API** — Anthropic SDK for all AI reasoning
  - **Stripe** — Subscription management, usage tracking, billing portal
  - **SendGrid** — Daily briefing emails, follow-up reminder digests, marketing email delivery
  - **Google Analytics / Search Console** — Track marketing content performance
- **Data pipeline:** Supabase Edge Functions or Next.js API routes running on cron schedules. Pull from Teams/Outlook every 5-15 min, SFDC hourly, call recordings daily. Use Supabase Realtime for live dashboard updates.
- **Transcript processing:** Teams provides transcripts via Graph API. Process through Claude to extract: summary, action items, objections, competitor mentions, pricing discussions, follow-up commitments.
- **UI:** Next.js 16 App Router. Tailwind CSS with dark/light theme. Use `/award-winning-design` principles — premium, interactive, mission control feel. Dashboard-first. Responsive for mobile.
- **Notifications:** Teams messages (primary via Graph API), SendGrid email digest (secondary), browser push notifications (tertiary). Follow-up reminders must be impossible to ignore.
- **Security:** Supabase RLS for data isolation. OAuth tokens encrypted at rest in Supabase Vault or environment variables. No raw communications stored outside Supabase. All AI processing through Claude API with ephemeral context (no training on my data).
- **Fallback mode:** Every MCP server and integration must have a manual fallback. If Teams MCP is down → paste transcript. If Outlook is blocked → forward to ingest email. If SFDC is locked → manual deal stage updates with batch sync later. App is never unusable because one integration is down.

---

## THE $1M MATH — KEEP THIS VISIBLE

The app should always show my path to $1M:

| Metric | Target |
|---|---|
| Annual revenue goal | $1,000,000 |
| Average ACV | $100,000 |
| Customers needed | 10 |
| Monthly revenue pace | $83,333/mo (after ramp) |
| Quarterly revenue pace | $250K/quarter (after Q1 ramp) |
| My 25% rev-share at $1M | $250,000 |
| My total comp at $1M | $475,000 |

**Stretch scenarios to display:**

| Revenue | Customers | My Rev-Share | My Total Comp |
|---|---|---|---|
| $500K | 5 | $125K | $350K |
| $900K | 9 | $225K | $450K (OTE) |
| $1M | 10 | $250K | $475K |
| $1.5M | 15 | $375K | $600K |
| $2M | 20 | $500K | $725K |
| $3M | 30 | $750K | $975K |
| $5M | 50 | $1.25M | $1.475M |

---

## COMPETITIVE LANDSCAPE TO SEED INTO THE APP

Pre-load this competitive intelligence:

**Bombora** — Largest B2B intent data co-op. 5,000+ publisher sites. Account-level only (not contact-level). $56M revenue. $168M valuation. 3x multiple. The market's default but facing skepticism. Pricing: $30-80K/year. pharosIQ advantage: first-party > co-op, contact-level > account-level.

**6sense** — Revenue AI platform. $200M revenue but valuation crashed from $5.2B to $906M. Constant layoffs. 500B+ signals/month. Expensive ($50-150K+ annually). pharosIQ advantage: cleaner data source, no platform lock-in, lower price point.

**Informa TechTarget** — 220+ tech websites, 50M+ audience. Priority Engine product. But $459M goodwill impairment, revenue declining 6%. Stock down 94%. pharosIQ advantage: healthier company, more focused offering, contact-level precision.

**ZoomInfo** — $1.25B revenue but growing only 1%. Stock down 93%. Commoditizing contact data. Uses Bombora for intent. Pricing: $15-50K+/year. pharosIQ advantage: first-party signals vs. aggregated third-party.

**Intentsify** — Fastest-growing competitor. Forrester Wave leader (#1 current offering). PE-backed by BV Investment Partners. Acquired Five by Five (5x5) and Salutary Data. 21% revenue growth, 50% data solutions growth. Building a full-stack intent platform through acquisition. pharosIQ advantage: owned content ecosystem (not co-op), global coverage, managed services.

**Demandbase** — $250M+ revenue, profitable, double-digit growth. Full ABM platform. Uses mix of own data + third-party. pharosIQ advantage: purer first-party signal, contact-level vs. account-level, potential data supplier TO Demandbase.

---

## AGENT ARCHITECTURE — THE BRAIN

### The Master Agent: "The Strategist"

There must be a master AI agent that sits above everything else. This is not a passive tool that waits for me to click buttons. It is an **always-on strategist** whose sole job is figuring out how to help me sell more.

**What the Master Agent does:**

- **Morning Briefing (Daily):** Every morning before I start work, the Master Agent generates a briefing:
  - "Here are your 3 highest-priority actions today" (based on deal urgency, follow-up deadlines, meeting prep)
  - "Here's a prospect you should reach out to" (surfaced from the Prospect Engine overnight)
  - "Here's something I noticed" (patterns from ingested communications — e.g., "Apollo.io has mentioned intent data in 3 LinkedIn posts this week, they might be evaluating providers")
  - Pipeline health snapshot (pacing vs. $1M, deals at risk, momentum)

- **Deal Strategy:** For every active deal, the Master Agent should maintain a living strategy:
  - Where is this deal in the cycle?
  - What's the next best action to move it forward?
  - What objections might come up based on the ICP and competitor landscape?
  - What's the optimal pricing for this specific buyer?
  - "You should mention [specific case study / data point] in your next conversation because [reason]"

- **Pattern Recognition:** The Master Agent reads across ALL ingested data — Teams chats, emails, call transcripts, SFDC activity — and looks for patterns:
  - "Three prospects this month mentioned Bombora fatigue — consider building a 'Switch from Bombora' pitch"
  - "Your average deal cycle is 47 days. Deal X is at 60 days. Either push for close or qualify out."
  - "You close faster when you lead with the contact-level differentiation vs. the first-party messaging. Consider swapping your pitch order."
  - "Deals in the $150K+ range are stalling at Proposal stage. You might need a different negotiation approach for enterprise."

- **Revenue Forecasting:** The Master Agent should continuously model:
  - "Based on current pipeline + historical close rate, you're projected to hit $X by EOY"
  - "To hit $1M, you need to add $Y in pipeline by [date]"
  - "If you close deals A, B, and C this quarter, you'll be at Z% of goal"

- **Proactive Idea Generation:** The Master Agent should independently think about:
  - New use cases for the data ("Have you considered selling intent data to cybersecurity vendors? Companies researching security tools = they have a vulnerability")
  - New packaging ideas ("What if you offered a 'Competitive Intent' package — showing which companies are researching your prospect's competitors?")
  - Pricing experiments ("Prospect X pushed back on $100K. What if you offered $75K for 6 months with an auto-renewal at $100K? Gets them in the door.")
  - Upsell opportunities ("Customer Y bought Signals tier. Based on their usage patterns, they'd benefit from Intelligence tier — that's a $50K upsell")
  - Cross-sell into existing pharosIQ clients ("Marty's team has 200+ managed services clients. Which ones would also buy raw data?")

- **Weekly Strategy Memo:** Every Friday, the Master Agent writes me a 1-page strategy memo:
  - What worked this week, what didn't
  - Pipeline changes (new deals, advances, stalls, losses)
  - Revenue projection update
  - Top 3 recommendations for next week
  - One "big idea" I haven't considered

**The Master Agent is the most important part of this app.** Everything else is plumbing. The Master Agent is the brain that turns plumbing into revenue.

- **GTM Playbook Coach:** The Master Agent has access to a complete DaaS go-to-market playbook (`daas-gtm-playbook.md`) covering 12 workstreams: Legal & Compliance, Data Product Development, Pricing & Packaging, Sales Operations, Marketing & Demand Gen, Partnerships & Channel, Customer Success & Retention, Internal Stakeholder Management, Competitive Positioning, Revenue Operations & Forecasting, Personal Development & Network Activation, and Blind Spot Detection. The Master Agent should:
  - Track which playbook items are complete, in progress, or untouched
  - Proactively flag items that are overdue or being neglected ("You haven't addressed SOC 2 compliance yet — this will block financial services deals")
  - Weave playbook reminders into daily briefings ("Today's priority: close the Apollo deal. But also: you still haven't built the sample data file for API delivery — 3 prospects have asked for it this month")
  - Run a weekly meta-check: "Which playbook categories haven't been touched in 30+ days?"
  - Adapt the playbook over time: mark items done, add new items based on what's learned, deprecate items that turn out to be irrelevant
  - **The playbook is the Master Agent's curriculum.** It should know the full GTM lifecycle better than I do, because I'll get tunnel vision on deals and forget about legal, compliance, partnerships, customer success, and infrastructure.

### Sub-Agents

The Master Agent delegates to specialized sub-agents:

| Sub-Agent | Responsibility |
|---|---|
| **Prospect Scout** | Runs research sweeps (weekly via /last30days, /last7days). Surfaces new target companies. Enriches prospect profiles. |
| **Follow-Up Enforcer** | Monitors all conversations for promised actions. Creates reminders. Drafts follow-up emails. Escalates overdue items to RED on dashboard. Won't let anything slip. |
| **Call Analyst** | Processes Teams call transcripts. Extracts summaries, action items, objections, competitor mentions. Feeds insights to Master Agent. |
| **Competitive Watcher** | Monitors competitor news, pricing changes, product launches, and market sentiment. Alerts when something changes that affects positioning. |
| **Email Composer** | Drafts all outbound communications. Uses conversation history for context. Matches my voice. |
| **SFDC Sync Agent** | Keeps Salesforce in sync. Writes deal updates, logs activities, creates opportunities. Prevents double-entry. |

---

## CONTEXT WINDOW & HALLUCINATION PREVENTION

This is critical. The app will ingest thousands of emails, chat messages, call transcripts, and deal notes. Claude's context window cannot hold all of that at once. If you just dump everything into a prompt, the AI will hallucinate, confuse deals, mix up contacts, and give me bad advice. That's worse than no advice at all.

### Memory Architecture: Structured Retrieval, Not Brute Force

**Principle: Never rely on context window alone. Always ground AI responses in retrieved facts from the database.**

**1. Structured Data Store (Source of Truth)**
Every piece of information goes into the database with structured fields:
- Conversations: contact_id, deal_id, date, channel (Teams/email/call), raw_text, AI_summary, action_items[], follow_up_date
- Deals: deal_id, company, contacts[], stage, ACV, created_date, last_activity_date, notes[], win_probability
- Prospects: company, ICP_category, contacts[], estimated_ACV, research_notes, last_researched_date
- Action Items: item_id, description, owner (me or someone else), due_date, status, source_conversation_id

**The database is the single source of truth. The AI reads from it. The AI never "remembers" — it always looks up.**

**2. Retrieval-Augmented Generation (RAG)**
Before the AI responds to anything, it retrieves relevant records from the database:
- "Draft a follow-up to Apollo.io" → Retrieve: all conversations with Apollo, deal stage, last contact date, action items, pricing discussed
- "What's my pipeline?" → Retrieve: all deals with stages, ACVs, last activity dates, weighted probabilities
- "Prep me for my meeting with Demandbase" → Retrieve: all conversations, their current data providers, our competitive positioning, any objections raised

**The retrieval step happens BEFORE the AI generates. The AI's prompt includes: system instructions + retrieved context + user request. Never raw memory.**

**3. Summarization Ladder**
Raw data gets progressively summarized to manage volume:

| Level | What It Is | Retention |
|---|---|---|
| **Raw** | Full email text, full chat transcript, full call transcript | Stored in DB, used for search/retrieval, NOT sent to AI in full |
| **Summary** | AI-generated 3-5 sentence summary of each conversation | Stored in DB, this is what the AI reads for context |
| **Deal Brief** | Rolling summary of the entire deal: history, current state, next steps | Updated after every new conversation, this is the primary context for deal-related queries |
| **Weekly Digest** | Summary of all activity across all deals for the week | Used by Master Agent for strategy memos and pattern recognition |

**When the AI needs context about a deal, it gets the Deal Brief (1-2 paragraphs) — NOT 50 raw emails.**

**4. Anti-Hallucination Rules**

Hard rules the AI must follow:
- **NEVER state a fact about a deal, contact, or conversation without citing the source record** (conversation ID, date, channel). If it can't cite a source, it must say "I don't have a record of that."
- **NEVER invent pricing, dates, or commitments.** If I ask "what price did I quote Apollo?" and there's no record, the answer is "I don't have a record of a price quote to Apollo" — NOT a guess.
- **NEVER confuse contacts between deals.** Each deal has its own context silo. The AI retrieves per-deal, not globally.
- **Flag uncertainty.** If the AI is working from incomplete data (e.g., a partially transcribed call), it should say: "Based on the partial transcript from Feb 12, it sounds like they mentioned budget constraints, but the transcript was incomplete — confirm this with your notes."
- **Timestamp everything.** Every AI-generated summary, recommendation, and follow-up draft should include: when the source data was captured, when the analysis was generated, and how fresh the information is. "This deal brief was last updated 3 days ago based on your Feb 20 email exchange."

**5. Conflict Detection**
If ingested data contradicts existing records, the AI should flag it rather than silently overwrite:
- "You told Apollo $100K on Feb 10, but in your Feb 15 email you mentioned $85K. Which is the current price?"
- "SFDC shows this deal at Proposal stage, but your last Teams chat with Ben suggests it's back to Discovery. Which is correct?"

The AI asks ME to resolve conflicts rather than guessing.

---

## VOICE & PERSONALITY OF THE APP

This app should feel like a sharp, slightly intense co-pilot who:
- Starts every day with: "Here's what needs your attention"
- Is blunt about pipeline health: "Deal X is going cold — you haven't followed up in 8 days"
- Celebrates wins: "New deal closed! You're at 43% of your $1M goal"
- Thinks ahead: "Based on your pipeline, you'll hit $750K by EOY. To hit $1M, you need 3 more deals in the next 60 days at $83K ACV"
- Proactively finds prospects without being asked
- Drafts emails that sound like me, not like a robot
- Never lets me forget a follow-up. Ever.

---

## START BY:

1. **Database schema and memory architecture first.** Get the structured data store right — deals, contacts, conversations, action items, prospects. This is the foundation that prevents hallucination. Nothing works without this.
2. **Master Agent and sub-agent framework.** Define the agent orchestration layer — how the Master Agent delegates to sub-agents, how context is retrieved (RAG), how the summarization ladder works.
3. **Conversation tracker with follow-up automation.** This is my most urgent need — I will forget things without it.
4. **Dashboard with the $1M revenue tracker.** My daily command center.
5. **Integration layer** — Microsoft Graph API (Teams, Outlook, Calendar), Salesforce REST API. Get data flowing in.
6. **Call transcript processing pipeline.** Teams recordings → transcript → Claude summarization → structured data.
7. **Prospect engine with ICP categories pre-loaded.**
8. **30-60-90 day plan as interactive checklist.**
9. **Competitive intelligence seed data.**
10. **Email/message composer.**
11. **Master Agent daily briefing and weekly strategy memo.**

Ask me clarifying questions before you start building. I'd rather get the architecture right than move fast and rebuild.

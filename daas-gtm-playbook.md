# THE COMPLETE DAAS GO-TO-MARKET PLAYBOOK
## Everything You Need to Do to Bring pharosIQ's Data to Market

*This is the Master Agent's coaching checklist. Every item here is something the Strategist should track, remind you about, and help you execute. If you're not thinking about it, the agent should be.*

---

## 1. LEGAL & COMPLIANCE — The Foundation Nobody Thinks About Until It's Too Late

Most data salespeople skip this and get burned. You're selling *data about people*. The legal scaffolding has to be airtight before the first byte leaves the building.

- [ ] **Review your own employment agreement** — non-compete, non-solicitation, IP assignment clauses. Know what you signed. Make sure your DaaS work product belongs to pharosIQ, not you (and that's fine — just know the terms)
- [ ] **Data licensing agreement template** — this is YOUR contract with customers. It defines: what data they get, how they can use it, what they can't do with it (resell, commingle, reverse-engineer), duration, termination, indemnification. Get legal to build this. If pharosIQ doesn't have outside data licensing counsel, recommend one.
- [ ] **Data processing agreement (DPA)** — required under GDPR. Any customer processing EU personal data needs a DPA between you and them. pharosIQ may already have one for managed services — get it, review it, adapt it for DaaS.
- [ ] **Privacy compliance audit** — Map pharosIQ's data collection to:
  - GDPR (EU) — consent basis, data subject rights, cross-border transfer mechanisms
  - CCPA/CPRA (California) — opt-out rights, "sale" definition (DaaS literally sells data)
  - CAN-SPAM — if intent signals come from email engagement
  - State privacy laws (Virginia VCDPA, Colorado CPA, Connecticut, etc.)
  - ePrivacy Directive — cookie/tracking consent for EU publishers
- [ ] **Permission-based data verification** — pharosIQ claims "permission-based" data. Verify exactly what that means: what did users consent to? Does the consent cover third-party data licensing (DaaS)? This is the #1 due diligence question sophisticated buyers will ask. Have the answer cold.
- [ ] **Terms of service for DaaS product** — separate from the licensing agreement. Covers: acceptable use, API terms, rate limits, data freshness disclaimers, SLAs
- [ ] **Master services agreement (MSA)** — enterprise customers will want their own MSA. Have a template ready but expect redlines.
- [ ] **SOC 2 Type II compliance** — Does pharosIQ have it? If not, start the conversation. Enterprise data buyers (especially financial services) will require it. This takes 6-12 months to get. Don't wait.
- [ ] **Cyber liability insurance** — Confirm pharosIQ carries it. If you're licensing data that gets breached at a customer's site, you need coverage.
- [ ] **IP ownership documentation** — Clearly establish that the data, algorithms, and delivery infrastructure are pharosIQ's IP. This matters for valuation and M&A.
- [ ] **International data transfer mechanisms** — If selling to EU customers: Standard Contractual Clauses (SCCs), adequacy decisions, or Binding Corporate Rules. This is real and auditable.

**Why this matters:** One angry prospect who asks "What's your consent basis under GDPR?" and gets a shrug will walk. Worse, one customer who misuses the data and points to a vague licensing agreement will cost you more than the deal was worth. Get this right early.

**The Master Agent should:** Flag any prospect in a regulated industry (financial services, healthcare, government) and auto-suggest: "This buyer will ask about SOC 2, DPAs, and data provenance. Are those materials ready?"

---

## 2. DATA PRODUCT DEVELOPMENT — Know What You're Selling

You can't sell what you can't describe. Before you pitch anyone, you need to know the data inside and out.

- [ ] **Data dictionary deep dive with Ben** — Understand every field, every signal type, every category. Not at a marketing level — at a technical level. You should be able to answer: "What does a record look like? What fields are included? What's the schema?"
- [ ] **Data quality audit** — Measure and document:
  - **Accuracy** — How accurate are the company identifiers? Contact info? Job titles?
  - **Freshness** — How often is data updated? What's the lag between a signal and delivery?
  - **Completeness** — What % of records have all fields populated? What's typically missing?
  - **Coverage** — Geographic coverage (US vs. global), industry coverage, company size coverage
  - **Match rates** — If a customer sends you their target account list, what % can you match?
  - **Deduplication** — How are duplicate contacts/companies handled?
- [ ] **Define the DaaS product taxonomy** — pharosIQ has 8,756 intent categories. Group these into buyer-friendly packages:
  - By topic vertical (cybersecurity intent, cloud intent, HR tech intent, etc.)
  - By funnel stage (research, comparison, purchase intent)
  - By geography (US, EMEA, APAC)
  - By signal strength (high-confidence vs. directional)
- [ ] **Build sample data files** — Every prospect will say "Can I see the data?" Have ready:
  - Sample flat file (CSV/JSON) with 50-100 anonymized records
  - Sample API response payload
  - Before/after enrichment example (their CRM data + your intent signals = better targeting)
- [ ] **Define data delivery specifications**:
  - **API**: REST API with documentation. Rate limits, authentication (API key, OAuth), endpoints, response formats (JSON, XML), pagination, webhooks for streaming
  - **Flat file**: SFTP delivery. File formats (CSV, Parquet, JSON). Delivery cadence (daily, weekly, monthly). Naming conventions. Checksum validation
  - **Cloud delivery**: Snowflake Data Share, AWS Data Exchange, Azure Data Share, Google BigQuery
  - **Platform integration**: Pre-built connectors for Salesforce, HubSpot, Marketo, etc.
  - **Embedded/OEM**: White-label packages for partners to resell
- [ ] **Define refresh rates and SLAs**:
  - Real-time (streaming) — for API customers
  - Daily batch — for most flat file customers
  - Weekly — for lower-tier packages
  - SLA targets: API uptime (99.9%), data freshness (<24 hours), support response time
- [ ] **Build a sandbox/trial environment** — Let prospects test the data before buying. This is the single most effective sales tool in data licensing. "Here's 30 days of free data on your target accounts — tell me if it's good." If the data is good, it sells itself.
- [ ] **Match rate testing methodology** — When a prospect says "we want to evaluate," have a process:
  1. They send their target account list (100-500 accounts)
  2. You run it against pharosIQ's data
  3. Return: match rate, sample enriched records, intent signal summary
  4. This becomes the basis for the deal
- [ ] **Data documentation / user guide** — A customer-facing document explaining: what the data means, how to interpret signals, best practices for activation, common use cases, FAQ

**The Master Agent should:** Track which data materials are ready vs. missing. "You have a discovery call with Demandbase in 3 days but you haven't built the sample API response yet. Want me to draft the schema?"

---

## 3. PRICING & PACKAGING — The Art and Math of Monetization

This is where KickFire experience pays off. But pharosIQ's data is different from IP-to-company data, so the models need fresh thinking.

- [ ] **Cost of goods sold (COGS) analysis** — Work with Ben and Jeff to understand: what does it cost to produce and deliver the data? Publisher costs, infrastructure, processing, support. Your margin = revenue - COGS. Jeff cares about this.
- [ ] **Competitive pricing research** — Document what everyone charges:
  - Bombora: $30-80K/year (account-level intent)
  - ZoomInfo: $15-50K+/year (contact data + Bombora intent)
  - 6sense: $50-150K+/year (platform + intent)
  - TechTarget Priority Engine: $50-100K+/year
  - Intentsify: $40-80K/year (estimated)
- [ ] **Define product tiers** (suggested starting point):

  | Tier | What's Included | Delivery | Price Range |
  |---|---|---|---|
  | **Signals** | Raw intent signals by topic/category. Account-level. Weekly batch. | Flat file (SFTP) | $30-60K/year |
  | **Intelligence** | Contact-level intent + company firmographics. Daily delivery. 10 topic categories. | Flat file or API | $75-150K/year |
  | **Embedded** | Full API access. White-label rights. Custom categories. Real-time. Dedicated support. | API + SDK | $150-500K+/year (OEM) |

- [ ] **Pricing models to offer**:
  - Per-record (e.g., $0.50-$2.00 per enriched contact)
  - Per-seat (e.g., $500-1,500/user/month for platform access)
  - Flat annual license (fixed data feed at fixed price)
  - Usage-based API (per-call pricing with volume tiers)
  - OEM/white-label (revenue share or flat annual license)
- [ ] **Volume discounting** — Larger commitments = lower per-unit price. Model: 10% off at $100K, 15% off at $200K, 20%+ for $500K+
- [ ] **Contract structure**:
  - Annual contracts (preferred — gives you predictable revenue for Jeff's board reporting)
  - Multi-year discounts (3% off for 2-year, 5% off for 3-year — locks in revenue, boosts valuation)
  - Monthly option (for startups / SMBs only, 20% premium over annual rate)
- [ ] **POC / trial pricing** — Free 30-day trial for qualified prospects. Conversion target: 40%+ of trials convert to paid. Track this metric religiously.
- [ ] **Renewal and expansion mechanics**:
  - Auto-renewal clauses (opt-out, not opt-in)
  - Annual price increase cap (3-5% built into contract)
  - Expansion triggers: add more categories, more contacts, upgrade tier
  - Net revenue retention target: 110%+ (meaning existing customers grow their spend)
- [ ] **Rev-share vs. margin tracking** — Build a model that shows: for each deal, what's the revenue, what's the margin, what's your 25% rev-share. Jeff wants to see P&L impact, not just top-line.

**The Master Agent should:** When drafting a proposal, auto-model the pricing: "At $100K ACV with estimated 65% margin, this deal contributes $65K to operating income and $25K to your rev-share."

---

## 4. SALES OPERATIONS — The Machine Behind the Selling

You're building a revenue function from zero. That means you need the operational scaffolding too, not just the pitch.

- [ ] **CRM setup for DaaS pipeline** — Work with whoever owns Salesforce to create:
  - A separate Opportunity record type for DaaS deals (distinct from managed services)
  - Custom fields: deployment method, tier, ACV, contract length, data categories purchased
  - A DaaS-specific pipeline with stages: Lead → Qualified → Discovery → POC/Trial → Proposal → Negotiation → Closed Won/Lost
  - Dashboard for Jeff to see DaaS revenue separate from managed services
- [ ] **Proposal templates** — Build 3 versions:
  - One-page executive summary (for initial conversations)
  - Full proposal with pricing, data specs, use cases, ROI projections (for formal evaluation)
  - Enterprise proposal with legal terms, SLA commitments, implementation timeline (for $200K+ deals)
- [ ] **Order form / contract templates** — Standardized order forms that reference the MSA. Include: product tier, delivery method, volume, price, term, renewal terms, payment schedule
- [ ] **Billing and invoicing** — How will DaaS customers be invoiced? Net 30? Net 60? Monthly? Annually? Work with finance to set this up. Enterprise customers will demand Net 60+.
- [ ] **Revenue recognition** — DaaS revenue on annual contracts is recognized ratably (1/12 per month under ASC 606). Make sure finance understands this for board reporting.
- [ ] **Quote-to-cash process** — Map the full cycle: prospect says yes → order form signed → data provisioned → invoice sent → payment received → revenue recognized. Every step should have an owner and a timeline.
- [ ] **Deal registration** — If you ever bring on partners or channel resellers, you need a deal registration system to prevent conflicts. Not Day 1, but plan for it.
- [ ] **Win/loss analysis framework** — For every deal that closes (won or lost), document: why they bought (or didn't), what competitors they evaluated, what mattered most to them, what the decision timeline was. This data is gold for improving your pitch.

**The Master Agent should:** After every deal close (won or lost), prompt: "Time for win/loss analysis. Walk me through what happened and I'll log the patterns."

---

## 5. MARKETING & DEMAND GENERATION — You Are the Brand

As a solo DaaS sales leader, your personal brand IS the product's brand. You need to be visible.

- [ ] **Product naming** — Does the DaaS product get its own name? (e.g., "pharosIQ Data Cloud," "pharosIQ Intent Feed," "IQdata"). Or is it just "pharosIQ DaaS"? Discuss with Chris Vriavas. The name matters for positioning.
- [ ] **Landing page / microsite** — Even a single page on pharosiq.com that says "Data Licensing" with: what the data is, who it's for, how it's delivered, a "talk to us" CTA. Gives you something to link to in outreach.
- [ ] **Sales collateral** — Build during Days 31-60:
  - Pitch deck (10-12 slides max)
  - One-pager / leave-behind (PDF)
  - ROI calculator (spreadsheet or interactive)
  - Sample data preview
  - Competitive comparison ("pharosIQ vs. Bombora" one-pager)
  - Case study template (ready to fill when you close first customers)
- [ ] **Thought leadership** — You need to be the "first-party intent data" person in the market:
  - Write 2 LinkedIn posts per week minimum
  - Publish 1 blog post per month on pharosiq.com or LinkedIn articles
  - Topics: first-party vs. third-party data, contact-level vs. account-level, data quality, Bombora alternatives, the future of intent data
  - Comment on relevant posts from analysts, competitors, and prospects
- [ ] **Webinars / events** — Host or co-host 1 webinar per quarter:
  - "The State of B2B Intent Data" (solo — establish expertise)
  - Co-hosted with a prospect or early customer (builds relationship + social proof)
  - Joint webinar with a technology partner (mutual lead gen)
- [ ] **Analyst relations** — If Forrester or Gartner are evaluating intent data providers:
  - Get pharosIQ's DaaS product included in the Forrester Wave or Gartner MQ for intent data
  - Request analyst briefings — these are free. You present, they learn about you, and you might get included in research
  - This has MASSIVE impact on enterprise buyers who follow analyst guidance
- [ ] **G2 / TrustRadius / Gartner Peer Insights** — Create a product listing for the DaaS product. Encourage early customers to review. These are the new buying guides.
- [ ] **Conference presence** — Identify 3-5 events where DaaS buyers gather:
  - B2B Marketing Exchange (Demand Gen Report)
  - MarTech Conference
  - Forrester B2B Summit
  - SaaStr Annual (for SaaS/platform buyers)
  - Industry-specific events for non-obvious verticals
- [ ] **Partner co-marketing** — Once you have technology partners, co-market: joint case studies, co-branded webinars, integration launch announcements
- [ ] **Data marketplace listings** — Get pharosIQ's data listed on:
  - Clay.com Integration Marketplace (GTM engineers building enrichment workflows — highest-signal audience for contact-level intent data)
  - Snowflake Marketplace
  - AWS Data Exchange
  - Databricks Marketplace
  - These create inbound demand from data-savvy buyers

**The Master Agent should:** Track your content output: "You haven't posted on LinkedIn in 6 days. Here are 3 post ideas based on your recent conversations."

---

## 6. PARTNERSHIPS & CHANNEL — Scale Beyond Yourself

You can't close 10+ $100K deals alone in Year 1 without leverage. Partnerships are the multiplier.

- [ ] **Partnership strategy** — Define 3 partner types:
  - **Technology partners**: Companies whose products integrate with pharosIQ's data (ABM platforms, CDPs, CRMs). They embed your data, you get distribution.
  - **Referral partners**: Consultants, agencies, system integrators who recommend data providers. They send you deals, you pay a referral fee (10-15% of Year 1 ACV).
  - **Reseller/OEM partners**: Companies that white-label your data inside their own product. This is the big-money lane. An OEM deal with a major ABM platform could be $500K+ annually.
- [ ] **Technology integration roadmap** — Prioritize integrations by buyer demand:
  - **Clay.com** (GTM orchestration platform — 300K+ users, $5B valuation, 75+ data providers. No first-party contact-level intent provider in their marketplace today. Apply via Clay's Integration Partner Program. They build the connector to your REST API. ~30-60 day integration timeline. Contact: Data Partnerships team via clay.com or partnerships@clay.com. **Check with Jeff in Week 1 whether pharosIQ has an existing Clay relationship before reaching out.**)
  - Salesforce AppExchange (data enrichment app)
  - HubSpot App Marketplace
  - Snowflake Marketplace (native share)
  - AWS Data Exchange
  - Marketo / Adobe LaunchPoint
  - These integrations reduce friction for buyers and open inbound channels
- [ ] **Partner onboarding playbook** — When a partner signs up, what do they get? Data documentation, sample data, integration guide, co-marketing assets, pricing sheet. Make it easy for them to sell you.
- [ ] **OEM agreement templates** — OEM/white-label deals have different legal terms: usage limits, branding requirements, revenue share vs. flat fee, exclusivity (avoid granting it), territory restrictions
- [ ] **Channel conflict management** — If Marty's sales team is also talking to a prospect, you need rules of engagement. Define: who owns the relationship? Who gets the deal? This must be clear before it becomes a problem.
- [ ] **Cross-sell into existing pharosIQ customers** — Marty has 200+ managed services customers. Some of them would also buy raw data. Work with Marty (not around him) to identify cross-sell opportunities. This is the fastest pipeline source you have.

**The Master Agent should:** After every competitor mention in a conversation, suggest: "Demandbase currently buys intent data from Bombora. They're a potential DaaS customer AND technology partner. Want me to draft a dual-purpose outreach?"

---

## 7. CUSTOMER SUCCESS & RETENTION — Keep What You Kill

Closing a deal is half the job. Renewing it is the other half. Net revenue retention is the metric that drives enterprise value.

- [ ] **Customer onboarding playbook** — When a customer signs:
  - Day 1: Welcome email + intro to technical contact (you or Ben's team)
  - Week 1: Data provisioning (API keys, SFTP credentials, or file delivery)
  - Week 2: Data validation call — are they receiving data? Is it what they expected? Any quality issues?
  - Week 4: Usage review — are they actually activating the data? What's working?
  - Day 90: QBR (Quarterly Business Review) — ROI assessment, expansion discussion
- [ ] **Customer health monitoring** — Track:
  - API usage (are they hitting the endpoint? Declining usage = churn risk)
  - Support tickets (increasing = quality issues)
  - Contact engagement (are they responding to emails?)
  - NPS score (survey at Day 90, then annually)
- [ ] **Renewal process** — Start renewal conversations 90 days before contract expiration:
  - Day -90: Internal renewal review (health score, usage, expansion opportunity)
  - Day -60: Renewal conversation with customer (with expansion proposal)
  - Day -30: Contract sent
  - Day 0: Renewal close target
  - Never let a renewal sneak up on you. Auto-calendar these.
- [ ] **Expansion / upsell playbook**:
  - Add more intent categories
  - Upgrade from account-level to contact-level
  - Add more geographic coverage
  - Upgrade from flat file to API
  - Move from Signals to Intelligence to Embedded tier
  - Target: 20%+ expansion rate on renewals
- [ ] **Churn analysis** — If a customer doesn't renew, document:
  - Why they left (budget, quality, competitor, internal priority change)
  - What you could have done differently
  - Pattern recognition: if 3 customers churn for the same reason, fix the root cause
- [ ] **Customer advisory board** — Once you have 5+ customers, form a CAB:
  - Quarterly meetings (virtual)
  - Input on product roadmap, new categories, pricing
  - They feel invested, you get free product feedback, and they're less likely to churn
- [ ] **Case studies and references** — After every successful quarter with a customer, ask:
  - "Can we write a case study?" (if they'll go public)
  - "Can I use you as a reference?" (if they won't go public but will talk to prospects)
  - Every reference account accelerates the next sale

**The Master Agent should:** 90 days after every deal close, auto-prompt: "Customer X's 90-day QBR is coming up. Here's their usage data. Want me to build a QBR deck and expansion proposal?"

---

## 8. INTERNAL STAKEHOLDER MANAGEMENT — Play the Inside Game

You're joining a company with existing politics, relationships, and power dynamics. Navigate deliberately.

- [ ] **Weekly report to Jeff** — Every Friday, send Jeff a 5-minute read:
  - Pipeline summary (new deals, stage changes, revenue closed)
  - Key conversations this week
  - Blockers / requests
  - Plan for next week
  - Revenue pacing vs. plan
  - Jeff is a finance person. He wants numbers, trajectory, and P&L impact.
- [ ] **Board reporting prep** — TA Associates reports to LPs. Chimni is chairman. Jeff presents to the board. Make sure your DaaS revenue shows up prominently:
  - Revenue attribution (clearly labeled as new DaaS revenue line)
  - Pipeline report with weighted forecast
  - Customer logos / names
  - Trajectory / projection
  - Competitive positioning (where pharosIQ's DaaS fits in the market)
  - Make Jeff's job easy by having your data ready before he asks
- [ ] **Day 1-30: Confirm off-limits companies with Jeff** — Jeff flagged Intentsify as a no-sell (direct competitor). Get the full list. Specifically ask about:
  - Clay.com (distribution partner, not competitor — they're a platform that aggregates data providers, not an intent data company. But they acquired Avenue for intent signals, so worth confirming Jeff's view)
  - Any ABM platforms pharosIQ already has relationships with (Demandbase, 6sense, etc.)
  - Any existing data licensing partnerships or exclusivity agreements that constrain your outreach
- [ ] **Relationship with Ben Luck (Chief Data Scientist)** — Ben is your champion. Keep him close:
  - Meet weekly during Month 1
  - Involve him in data quality discussions and customer technical questions
  - Give him visibility into what customers want (this shapes his product roadmap)
  - When you need something from the data team, go through Ben first
- [ ] **Relationship with Marty Fettig (EVP Sales)** — Potential land mine. You're a new revenue line that could be seen as competing with managed services:
  - Proactively define swim lanes: DaaS is raw data licensing, managed services is campaign execution
  - Find cross-sell opportunities that benefit Marty (managed services customer who also wants raw data = revenue for both)
  - Never pitch a managed services customer without telling Marty first
  - Celebrate joint wins, not solo wins
- [ ] **Relationship with Chris Vriavas (Chief Strategy Officer)** — Strategic ally:
  - Align on product naming, positioning, and market strategy
  - Chris thinks about where pharosIQ is going. Make sure DaaS is central to that vision.
  - Involve him in big deals and partnership decisions
- [ ] **IT / Engineering alignment** — You need technical resources for:
  - API infrastructure
  - SFTP delivery setup
  - Data pipeline development
  - Integration building
  - Understand who owns these resources and how to request them. You may not have a dedicated engineering team — know this early.
- [ ] **HR / admin** — Week 1 essentials:
  - System access (email, Teams, Salesforce, data platforms)
  - Benefits enrollment deadlines
  - Expense policy
  - Travel approval process
  - Business card
- [ ] **Budget management** — Do you have a budget for:
  - Sales tools (LinkedIn Sales Navigator, etc.)
  - Marketing (events, content, ads)
  - Travel (customer meetings, conferences)
  - Know this before you need it. Ask Jeff in Month 1.

**The Master Agent should:** Auto-draft Friday updates for Jeff. "Here's your weekly report based on this week's deal activity. Edit and send."

---

## 9. COMPETITIVE POSITIONING — Win the Narrative

You're not the cheapest, the biggest, or the most established. You have to win on story.

- [ ] **Battle cards** — Build a one-page competitive battle card for each rival:
  - pharosIQ vs. Bombora ("Co-op account-level vs. first-party contact-level")
  - pharosIQ vs. 6sense ("Locked-in platform vs. flexible data feed")
  - pharosIQ vs. TechTarget ("Declining publisher vs. growing content ecosystem")
  - pharosIQ vs. ZoomInfo ("Aggregated third-party vs. owned first-party")
  - pharosIQ vs. Intentsify ("Co-op model vs. permission-based content engagement")
  - pharosIQ vs. Demandbase ("We're a potential data SUPPLIER, not a competitor")
- [ ] **Win themes by ICP** — Different buyers care about different things:
  - ABM platforms: coverage, accuracy, API reliability, ease of integration
  - Sales intel tools: contact-level precision, real-time signals, match rates
  - CRMs: ease of embedding, white-label options, data freshness
  - Ad tech: audience scale, geographic targeting, deterministic vs. probabilistic
  - Financial services: data provenance, compliance, auditability
- [ ] **Objection handling playbook** — Prepare for the questions you'll get in every deal:
  - "How is this different from Bombora?" (first-party vs. co-op, contact-level vs. account-level)
  - "We already have 6sense/Demandbase — why do we need more intent data?" (complement, don't replace; different signal source; eliminate single-vendor risk)
  - "Can you prove the data is accurate?" (match rate test, trial, case studies)
  - "What's your scale?" (125.3M contacts (last 90 days), 25M companies, 8,756 categories — but be honest about where you're lighter)
  - "Who else uses this?" (your early customers — get references fast)
  - "Why haven't we heard of you?" (pharosIQ is a $60M company with 1,300 employees — you're not a startup; the DaaS product is new, the data and company aren't)
- [ ] **Competitive monitoring cadence** — Weekly check:
  - Competitor press releases, blog posts, product updates
  - G2 / TrustRadius new reviews
  - LinkedIn posts from competitor sales teams (what are they saying?)
  - Job postings (hiring = growing; layoffs = dying)
  - Reddit / X sentiment shifts

**The Master Agent should:** Before every prospect meeting, auto-generate: "This prospect currently uses Bombora. Here's the battle card and 3 specific talking points for switching."

---

## 10. REVENUE OPERATIONS & FORECASTING — Jeff's Language

Jeff is a finance person. Speak his language.

- [ ] **Revenue model** — Build a detailed model showing:
  - Monthly revenue by customer
  - Pipeline by stage with weighted values
  - Conversion rates by stage (lead → qualified → discovery → trial → proposal → closed)
  - Average deal cycle length
  - Average ACV by ICP
  - Customer acquisition cost (your loaded cost ÷ customers acquired)
  - Lifetime value (ACV × average contract duration × renewal rate)
  - LTV:CAC ratio (target: >3:1)
- [ ] **Forecasting methodology** — Choose one and be consistent:
  - Weighted pipeline (deal ACV × close probability by stage)
  - Commit / upside / best case categories
  - Historical conversion rate applied to current pipeline
  - Update weekly. Present to Jeff monthly.
- [ ] **Unit economics** — For each deal, model:
  - Revenue
  - COGS (data production + delivery costs)
  - Gross margin
  - Your rev-share (25%)
  - Net contribution to pharosIQ operating income
  - This shows Jeff that DaaS is accretive, not just top-line sugar
- [ ] **Enterprise value impact** — The big picture for Jeff and the board:
  - DaaS revenue at a 9-10x multiple (data businesses get premium multiples)
  - vs. managed services revenue at 3-5x multiple
  - Every $1M in DaaS revenue adds ~$9-10M in enterprise value
  - This is the M&A argument: DaaS makes pharosIQ worth more per dollar of revenue

**The Master Agent should:** Update the revenue model weekly and flag: "Your weighted pipeline is $X. At your current conversion rate, you'll close $Y by EOY. You're $Z short of $1M."

---

## 11. PERSONAL DEVELOPMENT & NETWORK ACTIVATION — You as an Asset

- [ ] **Activate your network — Day 1** — You have relationships from KickFire, IDG, and the data ecosystem. Reach out to:
  - Former KickFire data customers who are now at new companies
  - IDG/Foundry contacts who might be data buyers or connectors
  - B2B data professionals on LinkedIn who know you from the KickFire days
  - Industry analysts who covered KickFire or covered the IDG acquisition
  - These warm conversations will generate your first pipeline faster than cold outreach
- [ ] **LinkedIn profile update** — Update your profile to reflect the new role. This is your #1 inbound lead gen tool. Every connection request, post, and comment is a potential pipeline touch.
- [ ] **Industry knowledge maintenance** — Stay sharp on:
  - Privacy regulation changes (GDPR enforcement actions, new US state laws)
  - Intent data market shifts (consolidation, new entrants, technology changes)
  - Buyer technology stack trends (CDPs, composable architecture, data clean rooms)
  - AI/ML impact on intent data (how is AI changing how buyers evaluate data?)
- [ ] **Speaking opportunities** — Apply to speak at 2-3 conferences in 2026:
  - Panels on first-party data, intent data quality, data monetization
  - You have a genuine KickFire → pharosIQ story that's compelling
  - Speaking = credibility = inbound leads
- [ ] **Mentor / advisor network** — Identify 2-3 people outside pharosIQ you can call when stuck:
  - A data licensing veteran who's done this before (you ARE one, but having a sounding board helps)
  - A sales leader who's built enterprise data sales at scale
  - Chris Pigott (investment banker) — for M&A and valuation perspective

**The Master Agent should:** On Day 1, prompt: "Let's build your warm outreach list. Who from KickFire, IDG, and your data network should hear about your new role?"

---

## 12. THE THINGS YOU'RE PROBABLY FORGETTING

These are the gaps the Master Agent should proactively flag when you haven't addressed them.

### Data Delivery Infrastructure
- [ ] Who builds and maintains the API? Do you have engineering resources?
- [ ] Who sets up SFTP delivery? Is there existing infrastructure or does this need to be built?
- [ ] What's the data delivery SLA? (you can't sell what you can't deliver)
- [ ] Do you have monitoring and alerting for data pipeline failures?
- [ ] What happens when a customer reports bad data? Who triages?

### Pricing Validation
- [ ] Have you tested pricing with at least 3 prospects before locking it in?
- [ ] Have you modeled the margin impact of different delivery methods? (API is cheaper to deliver than custom SFTP)
- [ ] Have you considered geographic pricing differences? (US data commands a premium over LATAM or APAC)

### Scale Planning
- [ ] What happens when you go from 5 to 50 customers? Do you need a team?
- [ ] When do you need to hire your first data partnerships manager? (probably at $2-3M revenue)
- [ ] When do you need a customer success person? (probably at 10+ customers)
- [ ] When does the API need to be upgraded for higher traffic? (before it becomes a problem)

### Brand Distinction
- [ ] Is the DaaS product clearly distinct from pharosIQ's managed services in the market's mind?
- [ ] Are prospects confused about whether they're buying a service or a data product?
- [ ] Does your sales collateral look different from the managed services collateral?

### Board-Level Awareness
- [ ] Does the board understand the DaaS strategy?
- [ ] Does TA Associates see the DaaS line as increasing their exit value?
- [ ] Are you in the room (or at least in the deck) when Jeff presents to the board?

### Customer Reference Acceleration
- [ ] Your first 3 customers are the most important customers you'll ever have — they're your proof points
- [ ] Offer them favorable terms in exchange for being referenceable
- [ ] A named case study from a recognizable company is worth $500K in pipeline

### Data Marketplace Distribution
- [ ] Snowflake Marketplace — buyers are already there looking for data
- [ ] AWS Data Exchange — enterprise data buyers shop here
- [ ] These marketplaces handle billing and distribution, lowering your operational burden

### Competitive Intelligence Automation
- [ ] Set up Google Alerts for every competitor name
- [ ] Monitor competitor job postings (hiring = growing areas; layoffs = weakness)
- [ ] Track competitor pricing changes (G2, vendor review sites, back-channel conversations)

### The "Who Owns What" Conversation
- [ ] If a managed services customer wants raw data, who owns the deal — you or Marty?
- [ ] If an existing partner wants to shift from service to data, who manages the transition?
- [ ] If a DaaS customer wants managed services too, do you hand off or dual-own?
- [ ] Get this codified in writing, not handshake agreements

---

## THE MASTER AGENT'S WEEKLY CHECK

Every Friday, the Master Agent should run through this meta-checklist:

1. **Legal**: Any legal materials still missing? Any compliance gaps?
2. **Product**: Is the data product ready to demo? Any documentation gaps?
3. **Pricing**: Has pricing been validated? Any new competitive pricing intel?
4. **Pipeline**: What entered, advanced, stalled, or closed this week?
5. **Follow-ups**: Any overdue? Any at risk of going cold?
6. **Content**: Did you post on LinkedIn this week? Any content published?
7. **Internal**: Did Jeff get his weekly update? Any internal requests outstanding?
8. **Partnerships**: Any partner conversations to advance?
9. **Retention**: Any existing customers approaching QBR or renewal?
10. **Blind spots**: Is there anything on this playbook that's been untouched for 30+ days?

**The last question is the most important one.** If something on this list hasn't been addressed in 30 days, the Master Agent should escalate it: "You haven't addressed SOC 2 compliance yet. This will block financial services deals. Want me to draft a request to Jeff?"

---

*This playbook is a living document. The Master Agent should update it as you learn what works and what doesn't. Every closed deal teaches you something. Every lost deal teaches you more.*

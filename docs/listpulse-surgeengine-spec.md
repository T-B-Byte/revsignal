# ListPulse: Contact Signal Validation

> "We don't sell lists. We validate who's real, who's reachable, and who's in market."

**Status:** Pending Romano approval of this spec.

**Compliance framework:** All outputs are derivative, blended, engagement-backed validation signals. Never raw vendor records. Once data enters pharosIQ's CRM and data warehouse, it becomes part of a unique, blended dataset. Sell signals, not spreadsheets.

---

## Product Mode

SurgeEngine currently has four modes. ListPulse is the fifth:

- **Surge Dossier** — AI-assembled account intelligence package
- **Surge Trending** — What companies are surging for my topics?
- **Surge Radar** — What are my target accounts surging for?
- **ICP Analyzer** — How well does this account match my ideal customer profile?
- **ListPulse** — How much of my contact database is dead?

**One message:** "You paid for 50,000 leads. 17,000 of them don't work at that company anymore. We'll tell you which ones, who replaced them, and where they went."

---

## Two Intake Paths

### Path A: Client List HAS LinkedIn URLs

```
LinkedIn URL → CoreSignal Real-time Employee API → live validation (under 30 seconds)
```

Direct hit. Highest confidence. No matching step needed.

### Path B: Client List Has NO LinkedIn URLs

```
Contact record → pharosIQ data warehouse (CoreSignal blend)
  → match and append LinkedIn URL
  → CoreSignal Real-time Employee API → live validation
```

If warehouse match fails, fall back to CoreSignal Search API (640M records) to find the LinkedIn URL.

---

## Layered Validation Stack

Each layer increases confidence. Not every layer is required for every scan.

| Layer | Tool | What It Does | When Used |
|-------|------|-------------|-----------|
| 1 | Email validation (Verifalia) | Remove hard bounces, flag catch-all domains | Every scan |
| 2 | Send-and-bounce | Content email to surface live engagement + additional bounces | Optional enrichment |
| 3 | CoreSignal Real-time API | Live employer/title validation via LinkedIn URL | Every scan (core engine) |
| 4 | Bing/Google preview scrapes | Triangulate identity without direct LinkedIn scraping | Fallback for edge cases |
| 5 | Manila QA team | Manual LinkedIn job/company verification | Current process (ListPulse automates this) |

---

## CoreSignal Real-time Employee API (Core Engine)

**Endpoint:** `POST /rtapi/v2/employee/scrape`

**Input:** LinkedIn profile URL

**Speed:** Under 30 seconds (cache miss), instant on cache hit

**Rate limit:** 50 URLs per minute (3,000/hour, ~72,000/day)

**Credits:** Separate pool from Search/Collect credits. 1 credit per successful request. Requires separate purchase from CoreSignal sales. NOT included in current contract (100K Collect + 300K Search/month).

**Response codes:**

| Code | Meaning | Credits charged? |
|------|---------|-----------------|
| 200 | Success | Yes |
| 402 | Insufficient credits | No |
| 408 | Timeout (retry OK) | No |
| 422 | Invalid URL or params | No |
| 453 | Profile deleted (privacy request) | No |
| 503 | Server error | No |

**Key fields returned:**

| Field | ListPulse use |
|-------|--------------|
| `name`, `headline`, `location` | Identity confirmation |
| `experience[]` with `company`, `title`, `date_from`, `date_to`, `is_current` | Current employer, departure dates, job history |
| `education[]` | Secondary identity matching |
| `skills`, `certifications` | Function/seniority inference |
| `connections_count`, `follower_count` | Influence signal |
| `similar_profiles[]` | Replacement contact discovery |

### How ListPulse Uses the Response

| Customer says | CoreSignal Real-time says | Classification |
|---|---|---|
| VP Marketing, Acme Corp | `is_current: 1` at Acme Corp | ✅ Current |
| VP Marketing, Acme Corp | CMO at Acme Corp, `is_current: 1` | ⚠️ Changed role (same company) |
| VP Marketing, Acme Corp | VP Marketing at Bolt Systems, `is_current: 1` | 🔴 Left company |
| VP Marketing, Acme Corp | No profile found | ❓ No match |

**Title comparison (Jobson + Claude):**

1. **Jobson** normalizes both titles (customer's record and CoreSignal's response) to standardized function + seniority. Deterministic, instant, no API cost.
2. If both map to the same function + seniority → ✅ match. No further processing.
3. If they differ, or Jobson can't resolve → **Claude** evaluates whether it's a meaningful role change or just a title variation. "VP Marketing" vs. "CMO" = role change worth flagging. "VP Demand Generation" vs. "Vice President, Demand Gen" = same role.

This saves thousands of Claude API calls per scan (50K contacts = 50K+ title comparisons). Jobson handles the bulk deterministically. Claude handles the edge cases.

---

## Processing Steps

### Step 1: Upload and Parse
- Accept CSV: name (or first + last), title, company, email (optional), LinkedIn URL (optional)
- Also accept: copy/paste from spreadsheet, HubSpot/Salesforce CSV export format
- Max rows: 1,000 (free), 50,000 (paid)
- Client-side validation before upload (Papa Parse)

### Step 2: Route by Data Quality
- Has LinkedIn URL → Path A (direct to CoreSignal Real-time)
- Has email only → Email validation first, then match against pharosIQ warehouse for LinkedIn URL → Path B
- Has name + company only → Match against warehouse → Path B

### Step 3: Match and Validate
- Path A: LinkedIn URL → CoreSignal Real-time API
- Path B: pharosIQ warehouse match → append LinkedIn URL → CoreSignal Real-time API
- Fallback: CoreSignal Search API (640M records) if warehouse miss

### Step 4: Classify Each Contact
- Compare customer record vs. CoreSignal real-time response
- Classify: Current, Role Changed, Left Company, No Match
- Jobson handles bulk title normalization; Claude handles edge cases only

### Step 5: Find Replacements (for Left Company contacts)
- Take original company + function/seniority
- CoreSignal Search API: find current employees at same company with similar title/function
- Claude normalizes: "Is 'Head of Growth Marketing' the same buying persona as 'VP Demand Gen'?" → Yes
- Return replacement with start date (how new they are in the seat)

### Step 6: Track Departed Contacts
- CoreSignal Real-time response includes full `experience[]` array
- Most recent `is_current: 1` entry = new employer, new title, start date
- Map where your contacts went

### Step 7: Enrichment Layers (Optional, Premium)
- **Email validation:** Verifalia (hard bounce removal)
- **Holmes intent signals:** Active topics, intent score, last engagement date on replacements and departed-at-new-company (pending Ben, back April 13)
- **Modigi:** US cell phone append
- **Engagement overlay:** pharosIQ intent signals from past 60-90 days
- **Buying signals:** In-market indicators

---

## Report Output

### Summary Dashboard

```
CONTACT SIGNAL REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Uploaded:    41,200 contacts
Scanned:     April 2026
Method:      CoreSignal Real-time Validation

✅ Verified current:              27,180  (66%)
⚠️ Changed role, same company:    4,820  (12%)
🔴 Left company:                  6,200  (15%)
❓ No match found:                3,000  (7%)

Replacements found:               4,960  (80% of departed)
Departed contacts tracked:        5,580  (90% of departed)

Est. wasted nurture spend: $28,400/mo
```

### Downloadable Reports (CSV)

1. **Verified Contacts** — all matched contacts with current title, company, validation date
2. **Where They Went** — departed contacts with new company, new title, start date, old company, old title
3. **Replacements** — for each departed contact: the new person at the original company in a similar role, with title, start date, and Holmes intent score + topics (if available)
4. **Unmatched** — contacts with no match (outside LinkedIn coverage, or potential fraud flags)
5. **Email Validation** — bounce status, catch-all flags (if email validation layer purchased)

---

## Pricing

| Tier | Price | What's included |
|------|-------|----------------|
| **Free scan** | $0 | Up to 1,000 contacts. Aggregate decay % only (no names, no details). CTA: unlock full report. Requires email. |
| **One-time audit** | $2,500-$5,000 | Up to 50,000 contacts. Full report: every stale contact, replacements, destinations. Downloadable CSVs. One-time Stripe payment. |
| **Quarterly refresh** | $15K-$25K/yr | Re-scan every 90 days. Decay trend dashboard. Alerts on key contacts. Stripe subscription. |
| **API/OEM** | Custom | Webhook or API endpoint for real-time scoring. Embed in customer's MAP/CRM. Per-record or monthly flat rate. |

### Enrichment Add-ons
- Email validation: included in paid tiers
- Holmes intent scoring: included in paid tiers (pending Ben)
- US cell phone append (Modigi): +$2/record
- Engagement overlay (60-90 day signals): included in quarterly+

---

## Data Flow

```
┌──────────────────┐
│  Customer        │
│  uploads CSV     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Parse + Route   │
│                  │
│  Has LinkedIn?   │──── YES ──→ Path A (direct)
│  Has email?      │──── YES ──→ Email validate → Warehouse match → Path B
│  Name+company?   │──── YES ──→ Warehouse match → Path B
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  pharosIQ Data Warehouse                 │
│  (CoreSignal blend)           │
│                                          │
│  Match contact → Append LinkedIn URL     │
│  Fallback: CoreSignal Search API (640M)  │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  CoreSignal Real-time Employee API       │
│  POST /rtapi/v2/employee/scrape          │
│                                          │
│  Input: LinkedIn URL                     │
│  Output: Current employer, title,        │
│          experience history, is_current  │
│  Speed: <30 seconds per profile          │
│  Rate: 50/min (3,000/hr)                │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  Classify (Claude)                       │
│                                          │
│  ✅ Current                              │
│  ⚠️ Role changed (same company)          │
│  🔴 Left company                         │
│  ❓ No match                             │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  For 🔴 Left Company:                    │
│                                          │
│  1. Where they went                      │
│     (experience[] → is_current: 1)       │
│                                          │
│  2. Who replaced them                    │
│     (CoreSignal Search: same company     │
│      + similar function/seniority)       │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  Enrichment Layers (optional)            │
│                                          │
│  • Email validation (Verifalia)          │
│  • Holmes intent signals (Ben, Apr 13)   │
│  • Modigi cell append                    │
│  • Engagement overlay (60-90 day)        │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  Generate Report                         │
│  Store in Supabase                       │
│  Deliver to customer                     │
└──────────────────────────────────────────┘
```

---

## Capacity and Cost Model

### CoreSignal Real-time API
- 50 URLs/minute = 3,000/hour = ~72,000/day
- A 50,000-contact scan takes ~17 hours at max rate
- Credits are separate from Search/Collect, priced separately
- **Action needed:** Get Real-time API credit pricing from CoreSignal

### CoreSignal Search/Collect (Current Contract)
- 100K Collect + 300K Search credits/month
- Used for: replacement contact searches, fallback matching
- $26,550/quarter ($106,200/year)

### Xverum (Current Contract)
- 400,000 XVP API calls/month at $8,600/month
- 700M profiles, 30-day verified
- Can supplement CoreSignal for validation or serve as secondary check
- **Action needed:** Confirm if additional API credits needed for ListPulse volume

### pharosIQ Data Warehouse
- CoreSignal blend
- Primary matching engine for Path B (no LinkedIn URL)
- No per-call cost (internal infrastructure)

---

## Tech Stack

- **Frontend:** Next.js (existing SurgeEngine)
- **CSV parsing:** Papa Parse, client-side validation
- **Queue/processing:** Background jobs for large lists (50K = ~17 hours)
- **Storage:** Supabase (upload history, scan results, customer accounts)
- **Payment:** Stripe (already integrated)
- **AI:** Jobson (title normalization, deterministic) + Claude (edge case title comparison, fuzzy matching)
- **APIs:** CoreSignal Real-time + Search, pharosIQ warehouse, Verifalia, Holmes (pending), Modigi

---

## Compliance Guardrails

Per Romano's directive:

1. **No bulk resale of raw vendor records.** All outputs are derivative, blended, action-oriented signals.
2. **Sales language says "signal validation" and "decay diagnostic."** Never "we sell data."
3. **Engagement-gated sharing.** Contacts shared with validation and engagement backing.
4. **No marketing copy implying raw data resale.** Legal review on any bulk-like offers.
5. **Positioning:** "We validate who's real, who's reachable, and who's in market. We turn your stale leads into a refreshed, verified universe, with updates on where they moved."

---

## Open Items

| # | Question | Who | Status |
|---|----------|-----|--------|
| 1 | CoreSignal Real-time API credit pricing and purchase | CoreSignal sales | Not started |
| 2 | Does Holmes support contact-level intent queries? | Ben Luck | Email sent, back April 13 |
| 3 | Additional Xverum API credits for volume | Romano | Discuss on call |
| 4 | Modigi integration path and per-record pricing | Romano | Mentioned on call, needs details |
| 5 | Romano approval of this spec | Romano | **This document** |

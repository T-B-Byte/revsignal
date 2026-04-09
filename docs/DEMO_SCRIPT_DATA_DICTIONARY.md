# Demo Script: PharosIQ Data Dictionary
### Expert-Level Walkthrough (~5–6 minutes)
---

## OPENING: THE PROBLEM (60 seconds)

> "Before I show you the data, let me frame the problem we solve.
>
> If you're running a martech product team or leading marketing strategy, you face a fundamental challenge: **you don't actually know who's in-market right now.** You have your CRM. You have your MAP. But those tools only show you people who've *already* raised their hand with *you*. That's maybe 3–5% of your total addressable market.
>
> The other 95%? They're out there reading whitepapers about your category. They're comparing vendors on review sites. They're consuming content that signals *exactly* what they're about to buy — and you can't see any of it.
>
> What if you could? What if you had a dataset that didn't just tell you *who* exists in your market, but *who's actively researching right now*, *what topics they care about*, and *how deep into the buying committee that research has spread?*
>
> That's what PharosIQ delivers. And I want to show you exactly what's inside."

---

## TRANSITION TO THE DATA DICTIONARY (15 seconds)

> "Let me start with the architecture of our data — because the structure is what makes this actionable, not just big."

**[Click the Data Dictionary tab]**

---

## THE FIVE DATASETS: THE CONNECTED INTELLIGENCE LAYER (90 seconds)

> "We deliver five interconnected datasets. I'm going to walk through each one, because the *connections* between them are where the real value lives."

**[Point to the five dataset cards across the top]**

> "Think of it as a funnel of intelligence:
>
> **First — Intent Intelligence** 🎯. This is company-level. For any given company domain, we can tell you: *what content are they engaging with, what topics does that map to, how many seniority levels inside that company have been reached, and what's the decision-maker engagement score.* This isn't just 'Company X visited a webpage.' It's 'Company X has had 4 different seniority levels across 3 departments engage with cybersecurity content in the last 30 days.' That's a buying committee lighting up.
>
> **Second — Signals** 📡. These are the raw engagement events — timestamped, geocoded, tied to specific content assets and topics. 348 million of these in the last 90 days alone. This is the real-time pulse. Every signal has a weighted score, an event type, and a geographic country code. You can watch markets move in real time.
>
> **Third — Content Assets** 📄. This is our content graph — what content is being consumed, what topics it covers, what vendors and products it references, what business challenges it addresses. This is the Rosetta Stone that translates raw engagement into *meaning*.
>
> **Fourth — Contacts** 👤. 134 million verified B2B professionals. Not scraped. Not inferred. Verified. Email, title, seniority, department, LinkedIn URL, phone, city, state, country. 16 fields per contact.
>
> **Fifth — Accounts** 🏢. Full firmographic records — company name, website, LinkedIn, industry, NAICS code, revenue range, employee size, headquarters location. 17 fields per account.
>
> **Here's the key:** these five datasets are all *linked*. A signal ties to a content asset, which ties to a topic, which ties to a contact, which ties to an account. You can trace the entire journey from 'this company is researching AI' all the way down to 'here's the VP of Product's email address and phone number.'"

---

## DRILL INTO CONTACTS — THE CROWN JEWEL (60 seconds)

**[Select "Contacts" from the dataset dropdown]**

> "Let me show you why the Contacts dataset is the crown jewel for a head of product at a martech company.
>
> You've got 16 fields per record. But the ones that matter most to you are these:
>
> **`seniority_name`** — We classify every contact into seven tiers: C-Level, EVP/GM, VP, Director, Manager, Individual Contributor, and Business Owner. Why does this matter? Because when you're building a product, you need to understand *who* in the org is driving adoption. We have 2.2 million C-Level contacts, 5.7 million Directors, 1.2 million VPs. That's your decision-maker layer — quantified across 195 countries.
>
> **`has_engaged`** — This is the boolean that changes everything. It tells you whether this contact has been *active* — consuming content, generating signals. You're not just getting a list. You're getting a list where we can tell you *who's awake right now*.
>
> **`department_name`** — Combined with seniority, this lets you build precise buying committee models. 'Show me all Directors and above in Marketing departments at companies with 1,000+ employees that have engaged with marketing automation content in NAMER.' That's a one-query operation against our data."

---

## DRILL INTO ACCOUNTS — FIRMOGRAPHIC DEPTH (45 seconds)

**[Select "Accounts" from the dataset dropdown]**

> "Now look at the Accounts table — 17 fields.
>
> The fields that matter for product strategy:
>
> **`employee_size_name`** and **`revenue_range`** — We segment across 8 employee size bands from '1–50' all the way up to '10,000+', and 7 revenue bands from 'Under $10M' to '$1B+'.

**[Scroll down to the Lookup Values section]**

> "You can see all the lookup values right here. This is how our data is segmented — and every one of these is a filter you can apply.
>
> **`industry_name`** — 21 NAICS-aligned industry classifications. Professional Services, Manufacturing, Information, Finance, Healthcare — the top five alone cover over 80 million contacts.
>
> Why this matters to a product leader: you're not guessing at your TAM. You're *measuring* it. 'How many VP-and-above contacts do we have in Financial Services companies with 1,000+ employees in EMEA?' That's a real number you can get, not a Fermi estimate."

---

## INTENT INTELLIGENCE — THE 'WHY NOW' LAYER (45 seconds)

**[Select "Intent Intelligence" from the dataset dropdown]**

> "But the real differentiator is this dataset — Intent Intelligence. This is where we answer the question every product leader and every marketer is actually asking: **'Who should I talk to *right now*?'**
>
> Look at these fields:
>
> **`n_seniority_reached`** — If one intern at a company downloads a whitepaper, that's noise. But if 4 different seniority levels are engaging? That's a buying committee forming. This field quantifies that.
>
> **`score_decision_maker_reached`** — We weight engagement by seniority. A C-Level download matters more than an IC click. This score tells you *how high* the interest has reached.
>
> **`n_dept_reached`** — Cross-departmental engagement is the strongest buying signal there is. When Marketing *and* IT *and* Finance are all researching the same topic at the same company? That deal is real.
>
> This is the dataset that turns our 134 million contacts from a directory into a *prioritization engine*."

---

## THE STORY OUR DATA TELLS (45 seconds)

> "So let me give you a concrete example of the story this data tells.
>
> Right now, across our dataset, 196,000 accounts are actively researching artificial intelligence — generating 5.2 million signals in 90 days. That's the *macro* trend.
>
> But drill down: 55,600 of those accounts are in North America. 43,200 are in EMEA. You can see where the wave is hitting hardest.
>
> Now cross-reference that with our Contacts dataset: we have 23.4 million IT professionals and 8.9 million Marketing professionals. Layer on seniority — 2.2 million are C-Level, 5.7 million are Directors.
>
> You're a martech product leader wondering 'Is there a market for an AI-powered marketing tool in EMEA?' We don't just say yes. We say: 'Here are the 43,000 accounts actively researching AI in EMEA, here are the marketing professionals at those accounts, here are the decision-makers, and here's how intensely they're engaging.'
>
> That's not a report. That's a go-to-market blueprint."

---

## CLOSE (15 seconds)

> "The Data Dictionary is the *schema* of our intelligence. Every field I just showed you is queryable, filterable, and deliverable. Now let me show you what the data looks like when we bring it to life across our analysis reports."

**[Transition to the Overview tab for the full dashboard demo]**

---

## DELIVERY NOTES

- **Pace:** Conversational, not rushed. Pause after each dataset to let the visual register.
- **Gestures:** Point at specific fields on screen. Hover over cards as you name them.
- **Eye contact:** Look at your audience when stating the problem and the closing story. Look at the screen when walking through fields.
- **Key numbers to memorize:** 134M contacts, 348M signals (90 days), 64M accounts, 5 datasets, 16 contact fields, 17 account fields, 196K accounts researching AI, 2.2M C-Level contacts, 5.7M Directors, 23.4M IT professionals, 8.9M Marketing professionals.
- **If they ask "where does the data come from?":** "Multi-source: content syndication, email engagement, review site activity, display interactions, and voice — all feeding into a unified signal graph. 692,000 companies with signals in the last year."

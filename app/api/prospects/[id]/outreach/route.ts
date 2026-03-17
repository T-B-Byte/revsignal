import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, MODEL } from "@/lib/anthropic/client";

const schema = z.object({
  contact: z.object({
    name: z.string().min(1).max(200),
    title: z.string().max(200).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(50).optional(),
    linkedin: z.string().url().optional(),
  }),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Validate prospect ID format
  if (!/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ error: "Invalid prospect ID" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { contact } = parsed.data;

  // Fetch prospect (must belong to this user)
  const { data: prospect, error: prospectError } = await supabase
    .from("prospects")
    .select("id, company, icp_category, why_they_buy, fit_analysis, fit_score, estimated_acv, website, next_action, suggested_contacts")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (prospectError || !prospect) {
    return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
  }

  // 1. Save contact to contacts table
  const { data: savedContact, error: contactError } = await supabase
    .from("contacts")
    .insert({
      user_id: user.id,
      company: prospect.company,
      name: contact.name,
      role: contact.title || null,
      email: contact.email || null,
      phone: contact.phone || null,
      linkedin: contact.linkedin || null,
      icp_category: prospect.icp_category,
      is_internal: false,
    })
    .select()
    .single();

  if (contactError || !savedContact) {
    return NextResponse.json({ error: "Failed to save contact" }, { status: 500 });
  }

  // 2. Add contact ref to prospect.contacts JSONB array
  const { data: currentProspect } = await supabase
    .from("prospects")
    .select("contacts")
    .eq("id", id)
    .single();

  const existingContacts: { contact_id: string; name: string; role?: string }[] =
    currentProspect?.contacts ?? [];

  await supabase
    .from("prospects")
    .update({
      contacts: [
        ...existingContacts,
        { contact_id: savedContact.contact_id, name: contact.name, role: contact.title },
      ],
    })
    .eq("id", id)
    .eq("user_id", user.id);

  // 3. Draft prospecting email using stored intelligence
  const anthropic = getAnthropic();

  const prospectContext = [
    `Company: ${prospect.company}`,
    prospect.icp_category ? `ICP Category: ${prospect.icp_category}` : null,
    prospect.why_they_buy ? `Why they'd buy: ${prospect.why_they_buy}` : null,
    prospect.fit_score ? `Fit score: ${prospect.fit_score}` : null,
    prospect.estimated_acv ? `Estimated ACV: $${prospect.estimated_acv.toLocaleString()}` : null,
    prospect.website ? `Website: ${prospect.website}` : null,
    prospect.next_action ? `Recommended next action: ${prospect.next_action}` : null,
    prospect.fit_analysis
      ? `\nFull research analysis:\n${prospect.fit_analysis}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const systemPrompt = `You are The Strategist — an expert sales advisor for Tina Bean, SVP of Data Monetization & Partnerships at pharosIQ.

pharosIQ background:
- B2B intent data company with proprietary first-party data: 270M+ contacts, 650+ intent categories
- Delivery: API, flat file, cloud delivery, platform integration, or embedded/OEM
- Target ACV: $100K average, range $50K–$500K
- Key differentiator: first-party intent signals (not third-party co-op data like Bombora), directly observed from pharosIQ's owned media properties

Tina's voice rules (follow these exactly):
- Lead with the point. No "I wanted to reach out because..." — just say it
- Never sound defensive or apologetic. No "just" as a minimizer. State the ask confidently.
- Never imply the prospect's team hasn't done something or doesn't know their business
- Don't teach people what they already know — let them connect the dots
- Concise beats verbose. Cut every unnecessary word.
- Warm, professional, direct. Smart peer to smart peer. Not pitching up or down.
- Don't name specific competitors or target companies in the email
- Don't put pricing in a cold email

Write a short prospecting email (3–4 paragraphs max) introducing pharosIQ's data licensing capability and why it's relevant to this specific company. The email should feel like it was written for this company — not a template.

Use the research intelligence provided to make it specific. Reference what makes this company a compelling fit without being obvious about it.

Output ONLY the email body — no subject line, no metadata, no explanation.`;

  const userMessage = `Write a prospecting email to ${contact.name}${contact.title ? `, ${contact.title}` : ""} at ${prospect.company}.

Here is the research intelligence on this company:
${prospectContext}`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 800,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const firstContent = response.content?.[0];
  const emailBody =
    firstContent?.type === "text" ? firstContent.text.trim() : "";

  if (!emailBody) {
    return NextResponse.json(
      { error: "Failed to generate email draft. Try again." },
      { status: 500 }
    );
  }

  // 4. Draft a subject line
  const subjectResponse = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 60,
    system:
      "You are a direct-response copywriter. Write ONE compelling email subject line (6 words or fewer) for the email below. Output only the subject line, no quotes, no explanation.",
    messages: [
      {
        role: "user",
        content: `Company: ${prospect.company}\nContact title: ${contact.title || "unknown"}\nEmail body:\n${emailBody}`,
      },
    ],
  });

  const firstSubjectContent = subjectResponse.content?.[0];
  const subject =
    firstSubjectContent?.type === "text" && firstSubjectContent.text.trim()
      ? firstSubjectContent.text.trim().slice(0, 150)
      : `pharosIQ data licensing — ${prospect.company}`;

  return NextResponse.json({
    contact: savedContact,
    email: {
      subject,
      body: emailBody,
    },
  });
}

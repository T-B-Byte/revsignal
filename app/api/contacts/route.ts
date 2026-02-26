import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const createContactBodySchema = z.object({
  company: z.string().min(1),
  name: z.string().min(1),
  role: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  linkedin: z.string().url().optional(),
  icp_category: z.string().optional(),
  is_internal: z.boolean().optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/contacts
 * List contacts with optional filters: company, icp_category
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const company = searchParams.get("company");
  const icp = searchParams.get("icp_category");
  const search = searchParams.get("search");
  const limit = searchParams.get("limit");

  let query = supabase
    .from("contacts")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (company) {
    query = query.eq("company", company);
  }

  if (icp) {
    query = query.eq("icp_category", icp);
  }

  if (search) {
    // Sanitize search to prevent PostgREST filter injection
    const sanitized = search.replace(/[%,.*()]/g, "");
    if (sanitized) {
      query = query.or(
        `name.ilike.%${sanitized}%,company.ilike.%${sanitized}%,email.ilike.%${sanitized}%`
      );
    }
  }

  if (limit) {
    query = query.limit(Number(limit));
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ contacts: data });
}

/**
 * POST /api/contacts
 * Create a new contact
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createContactBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      user_id: user.id,
      company: parsed.data.company,
      name: parsed.data.name,
      role: parsed.data.role ?? null,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      linkedin: parsed.data.linkedin ?? null,
      icp_category: parsed.data.icp_category ?? null,
      is_internal: parsed.data.is_internal ?? false,
      notes: parsed.data.notes ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ contact: data }, { status: 201 });
}

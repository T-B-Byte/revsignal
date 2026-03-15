import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, MODEL } from "@/lib/anthropic/client";
import {
  extractProjectDetected,
  upsertDetectedProjects,
} from "@/lib/agents/strategist";

/**
 * POST /api/projects/seed
 * Batch extract projects from existing coaching threads.
 * Reads all coaching conversations, sends them to Claude to identify
 * project/people mentions, then auto-creates projects.
 */
export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all coaching threads with their messages
  const { data: threads, error: threadsError } = await supabase
    .from("coaching_threads")
    .select("thread_id, title, thread_brief")
    .eq("user_id", user.id)
    .order("last_message_at", { ascending: false });

  if (threadsError) {
    console.error("[api/projects/seed] Failed to fetch threads:", threadsError.message);
    return NextResponse.json({ error: "Failed to fetch threads" }, { status: 500 });
  }

  if (!threads || threads.length === 0) {
    return NextResponse.json({ message: "No coaching threads found", projectsCreated: 0 });
  }

  // Fetch user messages from all threads (the content that mentions projects)
  const { data: messages, error: messagesError } = await supabase
    .from("coaching_conversations")
    .select("content, thread_id, role")
    .eq("user_id", user.id)
    .eq("role", "user")
    .order("created_at", { ascending: true })
    .limit(500);

  if (messagesError) {
    console.error("[api/projects/seed] Failed to fetch messages:", messagesError.message);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }

  // Build a summary of all conversations for Claude to analyze
  const threadSummaries = threads.map((t) => {
    const threadMessages = (messages ?? [])
      .filter((m) => m.thread_id === t.thread_id)
      .map((m) => m.content)
      .join("\n---\n");

    return `## Thread: ${t.title}\n${t.thread_brief ? `Brief: ${t.thread_brief}\n` : ""}Messages:\n${threadMessages || "(no messages)"}`;
  });

  const combinedText = threadSummaries.join("\n\n===\n\n");

  // Truncate to avoid context window overflow
  const truncated = combinedText.slice(0, 80000);

  const anthropic = getAnthropic();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: `You are analyzing coaching conversation history to extract projects and collaborators.

A "project" is a named initiative, workstream, partnership, or effort that involves specific people working together. Examples: "SAP integration", "Leadscale partnership", "Leadpredict", "DaaS pricing model".

Extract ALL projects you can identify along with the people involved (name and role if mentioned).

Output ONLY a JSON array in this format, nothing else:
[{"name": "Project Name", "members": [{"name": "Person Name", "role": "Their Role"}]}]

Rules:
- Include the canonical/clean project name (not abbreviations)
- Include all people mentioned as working on each project
- Include roles when mentioned (CEO, EVP, CIO, etc.)
- Deduplicate: if the same project appears multiple times, merge the members
- Do NOT include Tina herself as a member
- Do NOT include generic company names as projects unless there's a clear initiative name
- If no projects are found, return an empty array: []`,
    messages: [
      {
        role: "user",
        content: `Analyze these coaching conversations and extract all projects with their collaborators:\n\n${truncated}`,
      },
    ],
  });

  const responseText =
    response.content.length > 0 && response.content[0].type === "text"
      ? response.content[0].text
      : "[]";

  // Parse the response — Claude should return a JSON array
  let detected: { name: string; members: { name: string; role?: string }[] }[] = [];
  try {
    // Handle response that might be wrapped in markdown code block
    const cleaned = responseText
      .replace(/^```(?:json)?\n?/m, "")
      .replace(/\n?```\s*$/m, "")
      .trim();
    detected = JSON.parse(cleaned);
    if (!Array.isArray(detected)) detected = [];
  } catch {
    // Try using the existing extraction function as fallback
    // in case Claude formatted it as a PROJECT_DETECTED block
    const withBlock = `<!-- PROJECT_DETECTED\n${responseText}\n-->`;
    detected = extractProjectDetected(withBlock);
  }

  // Upsert all detected projects
  if (detected.length > 0) {
    await upsertDetectedProjects(supabase, user.id, detected);
  }

  return NextResponse.json({
    message: `Extracted ${detected.length} projects from ${threads.length} coaching threads`,
    projectsCreated: detected.length,
    projects: detected.map((p) => ({
      name: p.name,
      memberCount: p.members.length,
    })),
  });
}

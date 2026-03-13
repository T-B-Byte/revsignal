import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, MODEL } from "@/lib/anthropic/client";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteContext = {
  params: Promise<{ entityId: string; documentId: string }>;
};

/**
 * POST /api/ma/[entityId]/documents/[documentId]/analyze
 * Send a document to Claude for strategic assessment.
 * Saves the analysis as an ma_note with note_type 'document'.
 */
export async function POST(_request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const { entityId, documentId } = await context.params;

  if (!UUID_REGEX.test(entityId) || !UUID_REGEX.test(documentId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch document + entity in parallel
  const [docResult, entityResult] = await Promise.all([
    supabase
      .from("ma_documents")
      .select("*")
      .eq("document_id", documentId)
      .eq("entity_id", entityId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("ma_entities")
      .select("company, entity_type, stage, strategic_rationale")
      .eq("entity_id", entityId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!docResult.data) {
    return NextResponse.json(
      { error: "Document not found" },
      { status: 404 }
    );
  }

  if (!entityResult.data) {
    return NextResponse.json(
      { error: "Entity not found" },
      { status: 404 }
    );
  }

  const doc = docResult.data;
  const entity = entityResult.data;

  // Race condition guard: only start if status is pending or failed
  if (doc.analysis_status === "analyzing") {
    return NextResponse.json(
      { error: "Analysis already in progress" },
      { status: 409 }
    );
  }

  if (doc.analysis_status === "complete") {
    return NextResponse.json(
      { error: "Document has already been analyzed" },
      { status: 409 }
    );
  }

  // Atomic status transition: only update if still pending/failed
  const { data: updated } = await supabase
    .from("ma_documents")
    .update({ analysis_status: "analyzing" })
    .eq("document_id", documentId)
    .eq("user_id", user.id)
    .in("analysis_status", ["pending", "failed"])
    .select("document_id")
    .maybeSingle();

  if (!updated) {
    return NextResponse.json(
      { error: "Analysis already in progress" },
      { status: 409 }
    );
  }

  try {
    // Download file from storage
    const { data: fileData, error: downloadErr } = await supabase.storage
      .from("ma-documents")
      .download(doc.storage_path);

    if (downloadErr || !fileData) {
      throw new Error(downloadErr?.message ?? "Failed to download file");
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    // Determine media type for Claude
    const isPdf = doc.mime_type === "application/pdf";

    const entityContext = [
      `Company: ${entity.company}`,
      `Type: ${entity.entity_type === "acquirer" ? "Potential Acquirer" : "Acquisition Target"}`,
      `Stage: ${entity.stage}`,
      entity.strategic_rationale
        ? `Strategic Rationale: ${entity.strategic_rationale}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    const systemPrompt = `You are The Strategist, RevSignal's AI advisor for M&A intelligence. You are reviewing a document uploaded for strategic assessment.

Context about this entity:
${entityContext}

The user (Tina) is SVP of Data Monetization & Partnerships at pharosIQ, a B2B intent data company (~$60M revenue). The CEO wants to sell the company this year. Tina tracks both potential acquirers and acquisition targets in the data/intent space.

Provide a thorough strategic assessment of this document. Structure your analysis as:

1. **Document Summary** — What this document is and its key points
2. **Strategic Relevance** — How this relates to ${entity.entity_type === "acquirer" ? "their potential interest in acquiring pharosIQ" : "pharosIQ potentially acquiring them"}
3. **Key Signals** — Important data points, financials, positioning, or competitive intelligence
4. **Red Flags** — Concerns, risks, or contradictions worth investigating
5. **Recommended Actions** — Specific next steps based on what you found

Be direct and specific. Cite page numbers or slide numbers when referencing specific content. Don't pad with filler.`;

    const contentBlocks: Parameters<
      ReturnType<typeof getAnthropic>["messages"]["create"]
    >[0]["messages"][0]["content"] = isPdf
      ? [
          {
            type: "document" as const,
            source: {
              type: "base64" as const,
              media_type: "application/pdf",
              data: base64,
            },
          },
          {
            type: "text" as const,
            text: `Review this document (${doc.filename}) and provide your strategic assessment.`,
          },
        ]
      : [
          {
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: doc.mime_type as
                | "image/jpeg"
                | "image/png"
                | "image/webp",
              data: base64,
            },
          },
          {
            type: "text" as const,
            text: `Review this image (${doc.filename}) and provide your strategic assessment.`,
          },
        ];

    const anthropic = getAnthropic();
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: contentBlocks,
        },
      ],
    });

    const analysisText =
      response.content
        .filter((block) => block.type === "text")
        .map((block) => {
          if (block.type === "text") return block.text;
          return "";
        })
        .join("\n\n") || "Analysis produced no text output.";

    // Save analysis as a note
    const noteContent = `**Strategic Assessment: ${doc.filename}**\n\n${analysisText}`;

    const { error: noteErr } = await supabase.from("ma_notes").insert({
      entity_id: entityId,
      user_id: user.id,
      content: noteContent,
      note_type: "document",
    });

    if (noteErr) {
      console.error("[api/ma/analyze] Note insert error:", noteErr.message);
      // If note save fails, mark as failed so user can retry
      await supabase
        .from("ma_documents")
        .update({ analysis_status: "failed" })
        .eq("document_id", documentId)
        .eq("user_id", user.id);

      return NextResponse.json(
        { error: "Analysis completed but failed to save. Please try again." },
        { status: 500 }
      );
    }

    // Mark as complete
    await supabase
      .from("ma_documents")
      .update({ analysis_status: "complete" })
      .eq("document_id", documentId)
      .eq("user_id", user.id);

    return NextResponse.json({
      analysis_status: "complete",
      note_content: noteContent,
    });
  } catch (err) {
    console.error("[api/ma/analyze] Analysis error:", err);

    // Mark as failed so user can retry
    await supabase
      .from("ma_documents")
      .update({ analysis_status: "failed" })
      .eq("document_id", documentId)
      .eq("user_id", user.id);

    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}

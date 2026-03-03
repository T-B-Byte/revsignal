import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processIntentCsv } from "@/lib/pipeline/intent-csv-ingest";

/**
 * POST /api/ingest/intent-signals-csv
 *
 * Upload and process a pharosIQ intent signals CSV.
 * Auth: User session (uploaded from the dashboard).
 *
 * Body: multipart/form-data with "file" field containing the CSV.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No CSV file provided. Upload a file with field name 'file'." },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith(".csv") && !file.name.endsWith(".tsv")) {
      return NextResponse.json(
        { error: "File must be a .csv or .tsv file" },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit for CSV uploads)
    const MAX_CSV_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_CSV_SIZE) {
      return NextResponse.json(
        { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 10MB.` },
        { status: 413 }
      );
    }

    // Read file content
    const csvText = await file.text();

    if (!csvText.trim()) {
      return NextResponse.json(
        { error: "File is empty" },
        { status: 400 }
      );
    }

    // Process the CSV
    const result = await processIntentCsv(supabase, user.id, csvText);

    return NextResponse.json({
      message: `Processed ${result.signalsStored} signals from ${result.totalRows} rows`,
      ...result,
    });
  } catch (error) {
    console.error(
      "[ingest/intent-signals-csv] Processing error:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: "Failed to process CSV" },
      { status: 500 }
    );
  }
}

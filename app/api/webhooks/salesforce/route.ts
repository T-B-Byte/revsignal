import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Salesforce record ID pattern: 15 or 18 alphanumeric characters
const SFDC_ID_PATTERN = /^[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?$/;

/**
 * POST /api/webhooks/salesforce
 *
 * Receives outbound messages from Salesforce workflow rules.
 * Salesforce sends XML-formatted SOAP messages when records change.
 *
 * Common triggers:
 *  - Opportunity stage change
 *  - Contact update
 *  - New activity logged
 *
 * Auth: SFDC_WEBHOOK_SECRET shared secret in query param or header.
 * For SOAP outbound messages, Salesforce Org ID is verified via SFDC_ORG_ID.
 *
 * We acknowledge receipt and queue for processing by the SFDC sync pipeline.
 */
export async function POST(request: NextRequest) {
  // Verify webhook authenticity
  const webhookSecret = process.env.SFDC_WEBHOOK_SECRET;
  const expectedOrgId = process.env.SFDC_ORG_ID;

  if (!webhookSecret && !expectedOrgId) {
    console.error("[webhook/salesforce] Neither SFDC_WEBHOOK_SECRET nor SFDC_ORG_ID configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // Check shared secret (custom REST webhooks send this as a header)
  const providedSecret = request.headers.get("x-sfdc-webhook-secret")
    ?? new URL(request.url).searchParams.get("secret");

  if (webhookSecret && providedSecret) {
    if (
      providedSecret.length !== webhookSecret.length ||
      !timingSafeEqual(providedSecret, webhookSecret)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const contentType = request.headers.get("content-type") ?? "";

  let body: string;
  let recordIds: string[] = [];
  let objectType = "unknown";

  if (contentType.includes("xml") || contentType.includes("soap")) {
    // Parse SOAP/XML outbound message
    body = await request.text();

    // Verify Salesforce Org ID from the SOAP envelope if configured
    if (expectedOrgId) {
      const orgIdMatch = body.match(/<sf:OrganizationId>([^<]+)<\/sf:OrganizationId>/);
      const receivedOrgId = orgIdMatch?.[1];
      if (!receivedOrgId || !receivedOrgId.startsWith(expectedOrgId)) {
        console.error("[webhook/salesforce] Org ID mismatch");
        return new NextResponse("Unauthorized", { status: 401 });
      }
    } else if (!providedSecret) {
      // No auth mechanism succeeded for SOAP messages
      console.error("[webhook/salesforce] No auth for SOAP message (set SFDC_ORG_ID)");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Extract record IDs from Salesforce outbound message XML
    // Format: <sf:Id>001XXXXXXXXXXXX</sf:Id>
    const idMatches = body.match(/<sf:Id>([^<]+)<\/sf:Id>/g);
    if (idMatches) {
      recordIds = idMatches
        .map((m) => m.replace(/<\/?sf:Id>/g, ""))
        .filter((id) => SFDC_ID_PATTERN.test(id));
    }

    // Detect object type from XML namespace or element names
    if (body.includes("sf:Opportunity") || body.includes("<Opportunity>")) objectType = "Opportunity";
    else if (body.includes("sf:Contact") || body.includes("<Contact>")) objectType = "Contact";
    else if (body.includes("sf:Account") || body.includes("<Account>")) objectType = "Account";
    else if (body.includes("sf:Task") || body.includes("<Task>")) objectType = "Task";
  } else {
    // JSON payload (custom REST webhook) — must have secret
    if (!providedSecret || !webhookSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jsonBody = await request.json();
    body = JSON.stringify(jsonBody);

    // Validate record IDs from JSON payload
    const rawIds: unknown[] = Array.isArray(jsonBody.recordIds) ? jsonBody.recordIds : [];
    recordIds = rawIds
      .filter((id): id is string => typeof id === "string" && SFDC_ID_PATTERN.test(id));

    objectType = typeof jsonBody.objectType === "string" ? jsonBody.objectType : "unknown";
  }

  const supabase = createAdminClient();

  // Store for processing by the sync pipeline
  for (const recordId of recordIds) {
    try {
      await supabase.from("ingested_messages").insert({
        user_id: "system",
        source: `sfdc-webhook-${objectType.toLowerCase()}`,
        external_id: recordId,
        raw_content: body,
        processed: false,
      });
    } catch (error) {
      console.error(
        `[webhook/salesforce] Failed to store notification for ${recordId}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  // Salesforce expects a specific SOAP ACK for outbound messages
  if (contentType.includes("xml") || contentType.includes("soap")) {
    const soapAck = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <notificationsResponse xmlns="http://soap.sforce.com/2005/09/outbound">
      <Ack>true</Ack>
    </notificationsResponse>
  </soapenv:Body>
</soapenv:Envelope>`;

    return new NextResponse(soapAck, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }

  return NextResponse.json({ received: true, recordIds });
}

/** Constant-time string comparison to prevent timing attacks. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Intent Stack Detector
 *
 * Scans a website's HTML (including script tags) for signatures of ABM and
 * intent data platforms. Used to infer whether a company is likely buying
 * Bombora intent data (or competing intent products) through platforms that
 * bundle it.
 *
 * Detection method: Fetches the raw HTML of a URL and matches against known
 * script domains, tag patterns, and pixel identifiers for each platform.
 *
 * This does NOT detect server-side data feed consumption (API/CSV ingestion),
 * only client-side tags that platforms require their customers to install.
 */

// ── Platform Signatures ──────────────────────────────────────────────

export interface PlatformSignature {
  /** Display name */
  name: string;
  /** What this platform does */
  category: "abm" | "intent_data" | "visitor_id" | "sales_intel";
  /** Domain patterns to match in script src, img src, iframe src, etc. */
  domainPatterns: string[];
  /** Additional regex patterns to search for in raw HTML */
  htmlPatterns?: RegExp[];
  /** Whether this platform is known to bundle Bombora data */
  bundlesBombora: boolean;
  /** Brief explanation of the Bombora relationship */
  bomboraRelationship: string;
}

export const PLATFORM_SIGNATURES: PlatformSignature[] = [
  // ── Direct Bombora tags (publisher/co-op member) ──────────────────
  {
    name: "Bombora (Direct)",
    category: "intent_data",
    domainPatterns: ["ml314.com", "tag.brandcdn.com", "bombora.com"],
    htmlPatterns: [/bombora[\s_-]?surge/i, /company[\s_-]?surge/i],
    bundlesBombora: true,
    bomboraRelationship:
      "Direct Bombora tag. This site is a Bombora co-op publisher or direct customer.",
  },

  // ── ABM platforms that bundle Bombora ─────────────────────────────
  {
    name: "Demandbase",
    category: "abm",
    domainPatterns: [
      "demandbase.com",
      "tag.demandbase.com",
      "api.demandbase.com",
      "company-targeted.js",
    ],
    htmlPatterns: [/demandbase\.com/i, /db_tag/i],
    bundlesBombora: true,
    bomboraRelationship:
      "Demandbase bundles Bombora Company Surge as a core intent data source for its ABM platform.",
  },
  {
    name: "6sense",
    category: "abm",
    domainPatterns: ["6sc.co", "j.6sc.co", "6sense.com", "eps.6sc.co"],
    htmlPatterns: [/6sense\.com/i, /_6senseScript/i, /6sc\.co/i],
    bundlesBombora: true,
    bomboraRelationship:
      "6sense uses Bombora intent data alongside its own predictive models. Bombora is their primary third-party intent source.",
  },
  {
    name: "Madison Logic",
    category: "abm",
    domainPatterns: ["madisonlogic.com", "ml.madisonlogic.com"],
    bundlesBombora: true,
    bomboraRelationship:
      "Madison Logic integrates Bombora Company Surge to power intent-based content syndication and ABM programs.",
  },
  {
    name: "Terminus (DemandScience)",
    category: "abm",
    domainPatterns: [
      "terminus.services",
      "terminusplatform.com",
      "t.terminus.services",
    ],
    htmlPatterns: [/terminus\.services/i, /terminusplatform/i],
    bundlesBombora: true,
    bomboraRelationship:
      "Terminus integrates Bombora intent signals for account prioritization and ad targeting.",
  },
  {
    name: "RollWorks",
    category: "abm",
    domainPatterns: [
      "rollworks.com",
      "nextroll.com",
      "d.adroll.com",
      "s.adroll.com",
    ],
    htmlPatterns: [/rollworks\.com/i, /adroll_adv_id/i],
    bundlesBombora: true,
    bomboraRelationship:
      "RollWorks (NextRoll) partners with Bombora to provide intent-driven account targeting and advertising.",
  },
  {
    name: "TripSight (ML Insights)",
    category: "abm",
    domainPatterns: ["tripsight.co", "mlinsights.com"],
    bundlesBombora: true,
    bomboraRelationship:
      "TripSight/ML Insights uses Bombora data for intent-based media activation.",
  },

  // ── Platforms with their own intent data (competitors, not Bombora) ──
  {
    name: "ZoomInfo",
    category: "sales_intel",
    domainPatterns: ["ws.zoominfo.com", "zoominfo.com", "cdn.zoominfo.com"],
    htmlPatterns: [/zoominfo\.com/i],
    bundlesBombora: false,
    bomboraRelationship:
      "ZoomInfo has its own intent data product (ZoomInfo Intent). Competitor, not a Bombora customer.",
  },
  {
    name: "Clearbit (HubSpot)",
    category: "visitor_id",
    domainPatterns: [
      "reveal.clearbit.com",
      "clearbit.com",
      "x.clearbitjs.com",
    ],
    htmlPatterns: [/clearbit\.com/i, /clearbitjs/i],
    bundlesBombora: false,
    bomboraRelationship:
      "Clearbit (acquired by HubSpot) provides its own visitor identification. Not a Bombora data consumer.",
  },
  {
    name: "Leadfeeder (Dealfront)",
    category: "visitor_id",
    domainPatterns: ["leadfeeder.com", "dealfront.com"],
    htmlPatterns: [/leadfeeder\.com/i, /dealfront\.com/i],
    bundlesBombora: false,
    bomboraRelationship:
      "Dealfront/Leadfeeder uses its own visitor identification. Not a Bombora consumer, but signals they buy B2B intent tools.",
  },
  {
    name: "G2",
    category: "intent_data",
    domainPatterns: ["g2crowd.com", "g2.com/js"],
    htmlPatterns: [/g2crowd\.com/i],
    bundlesBombora: false,
    bomboraRelationship:
      "G2 has its own buyer intent data from review site activity. Competitor to Bombora, not a consumer.",
  },
  {
    name: "TechTarget Priority Engine",
    category: "intent_data",
    domainPatterns: ["techtarget.com/tt"],
    htmlPatterns: [/techtarget.*pixel/i],
    bundlesBombora: false,
    bomboraRelationship:
      "TechTarget has proprietary intent data from its own media properties. Competitor to Bombora.",
  },
  {
    name: "Visitor Queue",
    category: "visitor_id",
    domainPatterns: ["visitorqueue.com"],
    bundlesBombora: false,
    bomboraRelationship:
      "Visitor Queue uses reverse IP lookup. Not a Bombora consumer, but indicates interest in B2B visitor identification.",
  },
  {
    name: "Drift / Salesloft",
    category: "abm",
    domainPatterns: ["drift.com", "js.driftt.com", "js.drift.com"],
    htmlPatterns: [/drift\.com/i, /driftt/i, /drift-frame/i],
    bundlesBombora: false,
    bomboraRelationship:
      "Drift (now Salesloft) integrates with Bombora optionally but does not bundle it by default.",
  },
];

// ── Detection Results ────────────────────────────────────────────────

export interface DetectedPlatform {
  name: string;
  category: string;
  bundlesBombora: boolean;
  bomboraRelationship: string;
  /** Which specific patterns matched */
  matchedPatterns: string[];
  /** Confidence: "high" if domain matched, "medium" if only HTML pattern */
  confidence: "high" | "medium";
}

export interface IntentStackScanResult {
  url: string;
  scannedAt: string;
  platforms: DetectedPlatform[];
  bomboraLikelihood: "high" | "medium" | "low" | "none";
  bomboraExplanation: string;
  /** Total platforms detected */
  totalDetected: number;
  /** Count of platforms that bundle Bombora */
  bomboraBundlers: number;
}

// ── URL Validation (mirrors prospect-scout pattern) ──────────────────

function validateExternalUrl(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Only HTTP/HTTPS URLs are allowed");
  }
  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "[::1]" ||
    hostname === "[::ffff:127.0.0.1]" ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    hostname === "169.254.169.254" ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".local") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
    /^\d+$/.test(hostname) ||
    hostname.startsWith("[")
  ) {
    throw new Error("Internal URLs are not allowed");
  }
  return parsed;
}

// ── Fetch Raw HTML (keeps script tags intact) ────────────────────────

async function fetchRawHtml(url: string): Promise<string> {
  validateExternalUrl(url);

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; RevSignal/1.0; +https://revsignal.app)",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch URL: ${response.status} ${response.statusText}`
    );
  }

  const html = await response.text();
  // Cap at 500K. We need scripts intact, so this is larger than prospect-scout's limit.
  return html.slice(0, 500_000);
}

// ── Core Scanner ─────────────────────────────────────────────────────

function scanHtmlForPlatforms(html: string): DetectedPlatform[] {
  const detected: DetectedPlatform[] = [];
  const htmlLower = html.toLowerCase();

  for (const sig of PLATFORM_SIGNATURES) {
    const matchedPatterns: string[] = [];
    let confidence: "high" | "medium" = "medium";

    // Check domain patterns (high confidence)
    for (const domain of sig.domainPatterns) {
      if (htmlLower.includes(domain.toLowerCase())) {
        matchedPatterns.push(`domain: ${domain}`);
        confidence = "high";
      }
    }

    // Check HTML regex patterns (medium confidence unless domain also matched)
    if (sig.htmlPatterns) {
      for (const pattern of sig.htmlPatterns) {
        if (pattern.test(html)) {
          const patternStr = pattern.source;
          // Avoid duplicate signals (e.g., "demandbase" domain + /demandbase/ regex)
          if (
            !matchedPatterns.some(
              (m) =>
                m.includes(patternStr) ||
                patternStr.toLowerCase().includes(m.replace("domain: ", ""))
            )
          ) {
            matchedPatterns.push(`html: /${patternStr}/`);
          }
        }
      }
    }

    if (matchedPatterns.length > 0) {
      detected.push({
        name: sig.name,
        category: sig.category,
        bundlesBombora: sig.bundlesBombora,
        bomboraRelationship: sig.bomboraRelationship,
        matchedPatterns,
        confidence,
      });
    }
  }

  return detected;
}

function assessBomboraLikelihood(
  platforms: DetectedPlatform[]
): Pick<IntentStackScanResult, "bomboraLikelihood" | "bomboraExplanation" | "bomboraBundlers"> {
  const bundlers = platforms.filter((p) => p.bundlesBombora);
  const highConfBundlers = bundlers.filter((p) => p.confidence === "high");
  const hasDirect = platforms.some(
    (p) => p.name === "Bombora (Direct)" && p.confidence === "high"
  );

  if (hasDirect) {
    return {
      bomboraLikelihood: "high",
      bomboraExplanation:
        "Direct Bombora tag detected. This company is either a Bombora co-op publisher or a direct customer.",
      bomboraBundlers: bundlers.length,
    };
  }

  if (highConfBundlers.length >= 2) {
    const names = highConfBundlers.map((p) => p.name).join(", ");
    return {
      bomboraLikelihood: "high",
      bomboraExplanation: `Multiple ABM platforms that bundle Bombora detected (${names}). Very likely consuming Bombora intent data through at least one.`,
      bomboraBundlers: bundlers.length,
    };
  }

  if (highConfBundlers.length === 1) {
    return {
      bomboraLikelihood: "medium",
      bomboraExplanation: `${highConfBundlers[0].name} detected, which bundles Bombora intent data. Likely consuming Bombora data through this platform.`,
      bomboraBundlers: bundlers.length,
    };
  }

  if (bundlers.length > 0) {
    return {
      bomboraLikelihood: "low",
      bomboraExplanation:
        "Weak signals for Bombora-bundling platforms detected, but confidence is low. May be false positives from generic patterns.",
      bomboraBundlers: bundlers.length,
    };
  }

  return {
    bomboraLikelihood: "none",
    bomboraExplanation:
      "No ABM or intent data platform tags detected. This company may still consume intent data server-side (API/CSV feeds), which is not detectable via website scanning.",
    bomboraBundlers: 0,
  };
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Scan a URL for ABM and intent data platform tags.
 * Returns detected platforms and a Bombora likelihood assessment.
 */
export async function scanIntentStack(
  url: string
): Promise<IntentStackScanResult> {
  const html = await fetchRawHtml(url);
  const platforms = scanHtmlForPlatforms(html);
  const assessment = assessBomboraLikelihood(platforms);

  return {
    url,
    scannedAt: new Date().toISOString(),
    platforms,
    totalDetected: platforms.length,
    ...assessment,
  };
}

/**
 * Scan raw HTML directly (for testing or when HTML is already fetched).
 */
export function scanIntentStackFromHtml(
  url: string,
  html: string
): IntentStackScanResult {
  const platforms = scanHtmlForPlatforms(html);
  const assessment = assessBomboraLikelihood(platforms);

  return {
    url,
    scannedAt: new Date().toISOString(),
    platforms,
    totalDetected: platforms.length,
    ...assessment,
  };
}

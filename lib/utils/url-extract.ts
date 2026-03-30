/**
 * Extract readable text content from URLs found in messages.
 * Used by the Strategist to "read" links users paste into chat.
 */

// Match http/https URLs, excluding common image extensions and markdown image syntax
const URL_REGEX = /(?<!\!\[[^\]]*\]\()https?:\/\/[^\s)<>"]+/gi;
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|svg|ico)(\?|#|$)/i;
const MAX_URL_FETCH = 3; // Don't fetch more than 3 URLs per message
const FETCH_TIMEOUT_MS = 10_000;
const MAX_TEXT_PER_URL = 12_000; // Characters per URL extraction
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5MB max download per URL

// Block SSRF: internal/private IPs and cloud metadata endpoints
const BLOCKED_HOSTS = /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+|0\.0\.0\.0|\[::1?\])/i;

/**
 * Find URLs in a message string, excluding image URLs and already-embedded doc sections.
 */
export function extractUrls(message: string): string[] {
  const matches = message.match(URL_REGEX) || [];
  const unique = [...new Set(matches)];
  return unique
    .filter((url) => !IMAGE_EXT.test(url))
    // Skip Supabase storage URLs (already uploaded attachments)
    .filter((url) => !url.includes("supabase.co/storage"))
    .slice(0, MAX_URL_FETCH);
}

/**
 * Fetch a URL and extract readable text content.
 * Handles HTML pages (strips tags) and plain text.
 * Returns null on failure.
 */
async function fetchUrlContent(url: string): Promise<string | null> {
  try {
    // SSRF protection: block internal/private network URLs
    const parsed = new URL(url);
    if (BLOCKED_HOSTS.test(parsed.hostname)) return null;
    // Only allow http/https schemes
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "RevSignal/1.0 (content extraction)",
        Accept: "text/html, text/plain, application/pdf, */*",
      },
      redirect: "follow",
    });
    clearTimeout(timer);

    if (!res.ok) return null;

    // Guard against oversized responses
    const contentLength = parseInt(res.headers.get("content-length") || "0", 10);
    if (contentLength > MAX_RESPONSE_BYTES) return null;

    const contentType = res.headers.get("content-type") || "";

    // Read body with size limit (content-length can be spoofed or missing)
    const arrayBuf = await res.arrayBuffer();
    if (arrayBuf.byteLength > MAX_RESPONSE_BYTES) return null;
    const buffer = Buffer.from(arrayBuf);

    // PDF from URL: extract with pdf-parse
    if (contentType.includes("application/pdf")) {
      try {
        const { PDFParse } = await import("pdf-parse");
        const parser = new PDFParse({ data: new Uint8Array(buffer) });
        const result = await parser.getText();
        await parser.destroy();
        const text = result.text?.trim();
        if (text) return text.slice(0, MAX_TEXT_PER_URL);
      } catch {
        return null;
      }
    }

    // Plain text
    if (contentType.includes("text/plain")) {
      return buffer.toString("utf-8").trim().slice(0, MAX_TEXT_PER_URL);
    }

    // HTML: strip tags and extract readable content
    if (contentType.includes("text/html")) {
      const html = buffer.toString("utf-8");
      return extractTextFromHtml(html).slice(0, MAX_TEXT_PER_URL);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Strip HTML tags and extract readable text.
 * Removes scripts, styles, nav, header, footer, and other non-content elements.
 */
function extractTextFromHtml(html: string): string {
  // Remove scripts, styles, and non-content tags
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // Convert common block elements to newlines
  text = text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|h[1-6]|li|tr|blockquote|section|article)[^>]*>/gi, "\n")
    .replace(/<\/?(td|th)[^>]*>/gi, "\t");

  // Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, "");

  // Clean up whitespace: collapse runs of blank lines, trim each line
  text = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line, i, arr) => line || (arr[i - 1] && arr[i - 1] !== ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}

/**
 * Extract URLs from a message, fetch their content, and return formatted text
 * sections that can be appended to the Strategist's context.
 * Returns empty string if no URLs found or all fetches fail.
 */
export async function fetchUrlContents(message: string): Promise<string> {
  const urls = extractUrls(message);
  if (urls.length === 0) return "";

  const results = await Promise.all(
    urls.map(async (url) => {
      const text = await fetchUrlContent(url);
      if (!text) return null;
      return `\n\n---\n🔗 **Content from ${url}**\n\n${text}`;
    })
  );

  return results.filter(Boolean).join("");
}

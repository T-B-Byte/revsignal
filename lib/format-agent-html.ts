/**
 * Convert markdown-ish AI agent text to safe HTML.
 * Handles ## headings, **bold**, `code`, bullet lists, and numbered lists.
 * Groups consecutive list items into <ul> wrappers for valid HTML.
 *
 * SECURITY NOTE: escapeHtml runs BEFORE formatInline regex replacements.
 * This ordering is load-bearing — escape first, then insert safe HTML tags.
 * Reversing this order would create an XSS vector.
 */
export function formatAgentHtml(text: string): string {
  const cleaned = stripFollowUps(text);
  const lines = cleaned.split('\n');
  const output: string[] = [];
  let inList = false;

  for (const line of lines) {
    const isListItem =
      line.startsWith('- ') || line.startsWith('* ') || /^\d+\.\s/.test(line);

    if (isListItem) {
      if (!inList) {
        output.push('<ul>');
        inList = true;
      }
      // Extract content after the bullet/number marker
      let content: string;
      if (line.startsWith('- ') || line.startsWith('* ')) {
        content = line.slice(2);
      } else {
        const match = line.match(/^\d+\.\s/);
        content = match ? line.slice(match[0].length) : line;
      }
      output.push(`<li>${formatInline(content)}</li>`);
    } else {
      if (inList) {
        output.push('</ul>');
        inList = false;
      }
      if (line.startsWith('## ')) {
        output.push(`<h3>${escapeHtml(line.slice(3))}</h3>`);
      } else if (line.trim() === '') {
        // skip empty lines
      } else {
        output.push(`<p>${formatInline(line)}</p>`);
      }
    }
  }

  // Close any trailing open list
  if (inList) {
    output.push('</ul>');
  }

  return output.join('\n');
}

function formatInline(text: string): string {
  let result = escapeHtml(text);
  // Bold
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Inline code
  result = result.replace(/`(.+?)`/g, '<code>$1</code>');
  return result;
}

/** Strip system-internal hidden blocks (FOLLOW_UPS, MEETING_DETECTED) from agent messages */
export function stripFollowUps(text: string): string {
  return text
    .replace(/<!-- FOLLOW_UPS\n[\s\S]*?(?:-->|$)/g, "")
    .replace(/<!-- MEETING_DETECTED\n[\s\S]*?(?:-->|$)/g, "")
    .trim();
}

/** Extract MEETING_DETECTED data from agent message */
export function extractMeetingDetected(text: string): {
  title: string;
  attendees: { name: string; role?: string }[];
  meeting_type?: string;
  suggested_agenda?: string[];
} | null {
  const match = text.match(/<!-- MEETING_DETECTED\n([\s\S]*?)(?:-->|$)/);
  if (!match) return null;
  try {
    const parsed: unknown = JSON.parse(match[1].trim());
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as Record<string, unknown>).title !== "string" ||
      !Array.isArray((parsed as Record<string, unknown>).attendees)
    ) {
      return null;
    }
    return parsed as {
      title: string;
      attendees: { name: string; role?: string }[];
      meeting_type?: string;
      suggested_agenda?: string[];
    };
  } catch {
    return null;
  }
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

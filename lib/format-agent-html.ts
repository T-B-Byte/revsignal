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
  const lines = text.split('\n');
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

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

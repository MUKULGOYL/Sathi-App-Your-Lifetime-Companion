/**
 * Sanitization and Prompt Injection Guard for Sathi
 */

/**
 * Strips dangerous HTML tags or script patterns from user input
 */
export function sanitizeUserInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');
}

/**
 * Escapes characters for safe plain text rendering
 */
export function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Encloses user content in distinct delimiters with anti-injection directive
 */
export function wrapInPromptDelimiters(content: string): string {
  return `<<<USER_DATA_START>>>\n${sanitizeUserInput(content)}\n<<<USER_DATA_END>>>`;
}

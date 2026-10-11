/**
 * Derive a conversation title from the first user message.
 *
 * Only leading markdown *markers* (#, >, -, *, _, `) and whitespace are stripped.
 * The hyphen is escaped on purpose: an unescaped `*-_` inside a character class is
 * a range (0x2A–0x5F) that also swallows every capital letter, which used to turn
 * "Hello" into "ello".
 */
export function deriveTitle(text: string, maxLength = 42): string {
  const clean = text.replace(/^[\s#>*_`\-]+/, '').trim();
  if (!clean) return 'New conversation';

  const firstLine = clean.split('\n')[0].replace(/\s+/g, ' ').trim();
  if (!firstLine) return 'New conversation';
  if (firstLine.length <= maxLength) return firstLine;

  // cut on a word boundary where possible
  const cut = firstLine.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 20 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

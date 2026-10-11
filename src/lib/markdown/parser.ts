import createDOMPurify from 'dompurify';
import katex from 'katex';
import { marked } from 'marked';
import { highlightCode, getExtensionForLanguage } from './syntax';

let purifyInstance: ReturnType<typeof createDOMPurify> | null = null;

function getPurify(): ReturnType<typeof createDOMPurify> | null {
  if (typeof window !== 'undefined') {
    if (!purifyInstance) {
      purifyInstance = createDOMPurify(window);
    }
    return purifyInstance;
  }
  return null;
}

// Configure marked renderer
const renderer = new marked.Renderer();

// Custom link renderer with rel="noopener noreferrer" and target="_blank"
renderer.link = function ({ href, title, text }) {
  const safeHref = href || '#';
  const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
  return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer"${titleAttr} class="text-primary hover:underline underline-offset-4">${text}</a>`;
};

// Custom table renderer to ensure horizontal scrolling
renderer.table = function (token) {
  const headerHtml = token.header
    .map((cell) => `<th class="border border-border px-3 py-2 text-left font-semibold text-foreground bg-muted/40">${cell.text}</th>`)
    .join('');
  const rowsHtml = token.rows
    .map(
      (row) =>
        `<tr class="border-b border-border/50 hover:bg-muted/20 transition-colors">${row
          .map((cell) => `<td class="border border-border px-3 py-2 text-foreground/90">${cell.text}</td>`)
          .join('')}</tr>`
    )
    .join('');

  return `
    <div class="my-4 overflow-x-auto rounded-md border border-border">
      <table class="w-full text-sm border-collapse text-left">
        <thead><tr class="border-b border-border">${headerHtml}</tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
  `;
};

// Custom code block renderer with language badge, copy, download, and syntax highlighting
renderer.code = function ({ text, lang }: { text: string; lang?: string }) {
  const language = (lang || 'plaintext').trim();
  const highlighted = highlightCode(text, language);
  const encodedRaw = encodeURIComponent(text);
  const ext = getExtensionForLanguage(language);
  const lineCount = text.split('\n').length;
  const isLong = lineCount > 24;

  return `
    <div class="code-block-container my-4 rounded-md border border-border bg-card overflow-hidden shadow-xs" data-raw-code="${encodedRaw}" data-ext="${ext}" data-lang="${escapeHtml(language)}">
      <div class="code-block-header flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/50 text-xs text-muted-foreground select-none">
        <span class="font-mono font-medium tracking-wide text-foreground/80 lowercase">${escapeHtml(language)}</span>
        <div class="flex items-center gap-1">
          <button type="button" class="btn-copy-code px-2 py-0.5 rounded hover:bg-accent hover:text-accent-foreground transition-colors font-sans text-xs flex items-center gap-1 cursor-pointer" title="Copy code" aria-label="Copy code">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            <span>Copy</span>
          </button>
          <button type="button" class="btn-download-code px-2 py-0.5 rounded hover:bg-accent hover:text-accent-foreground transition-colors font-sans text-xs flex items-center gap-1 cursor-pointer" title="Download file" aria-label="Download code file">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            <span>Download</span>
          </button>
          ${
            isLong
              ? `<button type="button" class="btn-toggle-expand px-2 py-0.5 rounded hover:bg-accent hover:text-accent-foreground transition-colors font-sans text-xs flex items-center gap-1 cursor-pointer" title="Expand / Collapse" aria-label="Toggle code expansion">
                  <span>Expand</span>
                </button>`
              : ''
          }
        </div>
      </div>
      <div class="code-block-body relative overflow-x-auto ${isLong ? 'max-h-72 overflow-y-auto is-collapsible' : ''}">
        <pre class="p-3 text-xs md:text-sm font-mono leading-relaxed text-foreground bg-transparent m-0 overflow-x-auto whitespace-pre"><code class="language-${escapeHtml(language)}">${highlighted}</code></pre>
      </div>
    </div>
  `;
};

marked.use({
  renderer,
  gfm: true,
  breaks: true,
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Preprocess and extract LaTeX mathematics before Markdown parsing
 * to prevent Markdown parsers from breaking mathematical symbols.
 */
function extractAndRenderLatex(content: string): { text: string; replacements: Map<string, string> } {
  const replacements = new Map<string, string>();
  let tokenCounter = 0;

  let text = content;

  // 1. Display math: $$...$$
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
    const token = `%%%BAMBOO_MATH_DISPLAY_${tokenCounter++}%%%`;
    try {
      const rendered = katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
      });
      replacements.set(token, `<div class="katex-display-wrapper my-3 overflow-x-auto py-1">${rendered}</div>`);
    } catch {
      replacements.set(token, `<pre class="text-xs text-destructive p-2">$$${escapeHtml(math)}$$</pre>`);
    }
    return token;
  });

  // 2. Display math: \[...\]
  text = text.replace(/\\\[([\s\S]+?)\\\]/g, (_, math) => {
    const token = `%%%BAMBOO_MATH_DISPLAY_${tokenCounter++}%%%`;
    try {
      const rendered = katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
      });
      replacements.set(token, `<div class="katex-display-wrapper my-3 overflow-x-auto py-1">${rendered}</div>`);
    } catch {
      replacements.set(token, `<pre class="text-xs text-destructive p-2">\\[${escapeHtml(math)}\\]</pre>`);
    }
    return token;
  });

  // 3. Inline math: \(...\)
  text = text.replace(/\\\(([\s\S]+?)\\\)/g, (_, math) => {
    const token = `%%%BAMBOO_MATH_INLINE_${tokenCounter++}%%%`;
    try {
      const rendered = katex.renderToString(math.trim(), {
        displayMode: false,
        throwOnError: false,
      });
      replacements.set(token, `<span class="katex-inline-wrapper">${rendered}</span>`);
    } catch {
      replacements.set(token, `<span>\\(${escapeHtml(math)}\\)</span>`);
    }
    return token;
  });

  // 4. Inline math: $...$ (requires non-space directly after starting $ and before ending $)
  text = text.replace(/(^|[^\\])\$([^\s$](?:[^$]*?[^\s$])?)\$/g, (match, prefix, math) => {
    const token = `%%%BAMBOO_MATH_INLINE_${tokenCounter++}%%%`;
    try {
      const rendered = katex.renderToString(math.trim(), {
        displayMode: false,
        throwOnError: false,
      });
      replacements.set(token, `<span class="katex-inline-wrapper">${rendered}</span>`);
    } catch {
      replacements.set(token, `<span>$${escapeHtml(math)}$</span>`);
    }
    return `${prefix}${token}`;
  });

  return { text, replacements };
}

/**
 * Main parseMarkdown function:
 * Converts raw markdown + LaTeX into sanitized, accessible HTML.
 */
export function parseMarkdown(rawContent: string): string {
  if (!rawContent) return '';

  // Extract LaTeX
  const { text: contentWithoutMath, replacements } = extractAndRenderLatex(rawContent);

  // Parse Markdown with marked
  let html = marked.parse(contentWithoutMath, { async: false }) as string;

  // Restore LaTeX replacements
  for (const [token, renderedMath] of replacements.entries()) {
    html = html.split(token).join(renderedMath);
  }

  // Sanitize with DOMPurify
  const purify = getPurify();
  if (purify) {
    html = purify.sanitize(html, {
      USE_PROFILES: { html: true, svg: true, mathMl: true },
      ADD_TAGS: [
        'annotation',
        'math',
        'semantics',
        'mtext',
        'mi',
        'mo',
        'mrow',
        'msup',
        'msub',
        'mfrac',
        'mover',
        'munder',
        'msqrt',
        'mtable',
        'mtr',
        'mtd',
      ],
      ADD_ATTR: [
        'data-raw-code',
        'data-ext',
        'data-lang',
        'target',
        'rel',
        'aria-hidden',
        'viewBox',
        'display',
      ],
    });
  }

  return html;
}

import Prism from 'prismjs';
// Import common languages
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-go';

/**
 * Maps common aliases to Prism language identifiers
 */
const LANGUAGE_ALIASES: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  golang: 'go',
  rs: 'rust',
  htm: 'markup',
  html: 'markup',
  xml: 'markup',
  svg: 'markup',
};

/**
 * Returns safe file extension for a given language
 */
export function getExtensionForLanguage(lang: string): string {
  const normalized = (lang || '').trim().toLowerCase();
  const extMap: Record<string, string> = {
    javascript: 'js',
    js: 'js',
    typescript: 'ts',
    ts: 'ts',
    tsx: 'tsx',
    jsx: 'jsx',
    python: 'py',
    py: 'py',
    bash: 'sh',
    sh: 'sh',
    shell: 'sh',
    zsh: 'sh',
    json: 'json',
    markdown: 'md',
    md: 'md',
    sql: 'sql',
    yaml: 'yaml',
    yml: 'yaml',
    html: 'html',
    css: 'css',
    c: 'c',
    cpp: 'cpp',
    cplusplus: 'cpp',
    java: 'java',
    rust: 'rs',
    rs: 'rs',
    go: 'go',
    text: 'txt',
    plaintext: 'txt',
  };
  return extMap[normalized] || 'txt';
}

/**
 * Highlight code safely using Prism.js
 */
export function highlightCode(code: string, rawLang: string): string {
  const langKey = (rawLang || '').toLowerCase().trim();
  const resolvedLang = LANGUAGE_ALIASES[langKey] || langKey;

  const grammar = Prism.languages[resolvedLang];
  if (grammar) {
    try {
      return Prism.highlight(code, grammar, resolvedLang);
    } catch {
      // Fallback to escape html
    }
  }

  // Fallback to escaped plain text
  return escapeHtml(code);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

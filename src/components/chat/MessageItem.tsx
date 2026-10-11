import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  Edit3,
  Paperclip,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import type { Message } from '../../types';
import { parseMarkdown } from '../../lib/markdown/parser';

interface MessageItemProps {
  message: Message;
  isLastAssistant: boolean;
  onRegenerate?: (id: string) => void;
  onEditUserMessage?: (id: string, newContent: string) => void;
  onDeleteMessage?: (id: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isLastAssistant,
  onRegenerate,
  onEditUserMessage,
  onDeleteMessage,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const contentRef = useRef<HTMLDivElement>(null);

  // Render sanitized markdown for assistant responses
  const parsedHtml = useMemo(() => {
    if (message.role === 'assistant') {
      return parseMarkdown(message.content);
    }
    return '';
  }, [message.content, message.role]);

  // Attach event handlers for code blocks inside assistant markdown
  useEffect(() => {
    if (message.role !== 'assistant' || !contentRef.current) return;
    const container = contentRef.current;

    const handleContainerClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Handle Copy Code
      const copyBtn = target.closest('.btn-copy-code') as HTMLButtonElement | null;
      if (copyBtn) {
        const codeBlock = copyBtn.closest('.code-block-container') as HTMLElement | null;
        if (codeBlock) {
          const rawEncoded = codeBlock.getAttribute('data-raw-code') || '';
          const rawCode = decodeURIComponent(rawEncoded);
          navigator.clipboard.writeText(rawCode).then(() => {
            const span = copyBtn.querySelector('span');
            if (span) {
              const orig = span.textContent;
              span.textContent = 'Copied!';
              setTimeout(() => {
                span.textContent = orig;
              }, 2000);
            }
          });
        }
        return;
      }

      // Handle Download Code
      const downloadBtn = target.closest('.btn-download-code') as HTMLButtonElement | null;
      if (downloadBtn) {
        const codeBlock = downloadBtn.closest('.code-block-container') as HTMLElement | null;
        if (codeBlock) {
          const rawEncoded = codeBlock.getAttribute('data-raw-code') || '';
          const ext = codeBlock.getAttribute('data-ext') || 'txt';
          const rawCode = decodeURIComponent(rawEncoded);
          const blob = new Blob([rawCode], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `bamboo-code-${Date.now()}.${ext}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
        return;
      }

      // Handle Expand / Collapse
      const expandBtn = target.closest('.btn-toggle-expand') as HTMLButtonElement | null;
      if (expandBtn) {
        const codeBlock = expandBtn.closest('.code-block-container') as HTMLElement | null;
        if (codeBlock) {
          const body = codeBlock.querySelector('.code-block-body') as HTMLElement | null;
          const span = expandBtn.querySelector('span');
          if (body && span) {
            const isCollapsed = body.classList.contains('max-h-72');
            if (isCollapsed) {
              body.classList.remove('max-h-72');
              span.textContent = 'Collapse';
            } else {
              body.classList.add('max-h-72');
              span.textContent = 'Expand';
            }
          }
        }
        return;
      }
    };

    container.addEventListener('click', handleContainerClick);
    return () => {
      container.removeEventListener('click', handleContainerClick);
    };
  }, [message.role, parsedHtml]);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editContent.trim()) return;
    if (onEditUserMessage) {
      onEditUserMessage(message.id, editContent);
    }
    setIsEditing(false);
  };

  // Special Context Boundary divider
  if (message.isContextBoundary) {
    return (
      <div className="w-full my-6 flex items-center justify-center select-none" role="separator">
        <div className="h-px bg-border flex-1 max-w-[120px]" />
        <span className="px-3 text-[11px] font-mono text-muted-foreground uppercase tracking-wider text-center">
          Context Boundary · Earlier messages excluded from model prompt
        </span>
        <div className="h-px bg-border flex-1 max-w-[120px]" />
      </div>
    );
  }

  // --- USER MESSAGE (RIGHT-ALIGNED) ---
  if (message.role === 'user') {
    return (
      <div className="w-full flex justify-end my-3 group">
        <div className="max-w-[88%] sm:max-w-[75%] md:max-w-[68%] flex flex-col items-end">
          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="w-full space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                className="w-full p-3 text-sm rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y"
              />
              <div className="flex items-center justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-2.5 py-1 rounded text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 rounded bg-primary text-primary-foreground font-medium cursor-pointer"
                >
                  Save & Resend
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Attachments preview */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-1.5 justify-end">
                  {message.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-muted/60 text-muted-foreground border border-border/40"
                    >
                      <Paperclip className="w-3 h-3" />
                      <span className="truncate max-w-[160px]">{att.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Message Bubble */}
              <div className="px-4 py-3 rounded-2xl rounded-tr-xs bg-secondary text-secondary-foreground text-sm leading-relaxed whitespace-pre-wrap break-words border border-border/40 shadow-xs">
                {message.content}
              </div>

              {/* Actions toolbar */}
              <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="p-1 rounded hover:bg-muted transition-colors cursor-pointer"
                  title="Edit message"
                  aria-label="Edit message"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="p-1 rounded hover:bg-muted transition-colors cursor-pointer"
                  title="Copy text"
                  aria-label="Copy text"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                {onDeleteMessage && (
                  <button
                    type="button"
                    onClick={() => onDeleteMessage(message.id)}
                    className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                    title="Delete message"
                    aria-label="Delete message"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // --- ASSISTANT MESSAGE (LEFT-ALIGNED) ---
  return (
    <div className="w-full flex justify-start my-4 group">
      <div className="w-full max-w-full md:max-w-3xl flex flex-col items-start">
        {/* Attribution header */}
        <div className="flex items-center gap-2 mb-1 text-[11px] text-muted-foreground select-none">
          <span className="font-serif font-medium text-foreground lowercase">bamboo</span>
          {message.modelName && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{message.modelName}</span>
            </>
          )}
          {message.isInterrupted && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-muted-foreground italic">(Stopped)</span>
            </>
          )}
        </div>

        {/* Content body */}
        <div
          ref={contentRef}
          className="w-full text-foreground text-sm leading-relaxed break-words"
        >
          {message.content ? (
            <div
              className="markdown-prose"
              dangerouslySetInnerHTML={{ __html: parsedHtml }}
            />
          ) : message.isStreaming ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span>Thinking...</span>
            </div>
          ) : null}

          {/* Streaming cursor */}
          {message.isStreaming && message.content.length > 0 && (
            <span className="inline-block w-1.5 h-4 ml-1 bg-primary animate-pulse align-middle" />
          )}

          {/* Error Banner */}
          {message.error && (
            <div className="my-2 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <span className="font-semibold block mb-0.5">Generation Error</span>
                <span>{message.error}</span>
              </div>
            </div>
          )}
        </div>

        {/* Assistant Actions toolbar */}
        {!message.isStreaming && (
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground opacity-80 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={handleCopyMessage}
              className="p-1 rounded hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              title="Copy response"
              aria-label="Copy response"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            {onRegenerate && isLastAssistant && (
              <button
                type="button"
                onClick={() => onRegenerate(message.id)}
                className="p-1 rounded hover:bg-muted hover:text-foreground transition-colors cursor-pointer flex items-center gap-1"
                title="Regenerate response"
                aria-label="Regenerate response"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="text-[11px]">Regenerate</span>
              </button>
            )}

            {onDeleteMessage && (
              <button
                type="button"
                onClick={() => onDeleteMessage(message.id)}
                className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                title="Delete message"
                aria-label="Delete message"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

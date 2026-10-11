import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, Paperclip, Square, X } from 'lucide-react';
import type { Attachment, GenerationState, ModelProfile } from '../../types';

interface ChatComposerProps {
  input: string;
  setInput: (value: string) => void;
  onSend: (content: string, attachments?: Attachment[]) => void;
  onStop: () => void;
  generationState: GenerationState;
  models: ModelProfile[];
  activeModel: ModelProfile | null;
  onOpenModelManager: () => void;
  enterToSend?: boolean;
}

const MIN_HEIGHT = 40;
const MAX_HEIGHT = 200;

export const ChatComposer: React.FC<ChatComposerProps> = ({
  input,
  setInput,
  onSend,
  onStop,
  generationState,
  models,
  activeModel,
  onOpenModelManager,
  enterToSend = true,
}) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isGenerating = generationState === 'generating' || generationState === 'connecting';

  // Hint: "Reply to <model display name>..." or a get-started prompt when no model is selected
  const placeholder = activeModel ? `Reply to ${activeModel.name}...` : 'Get started with bamboo';

  // Auto-resize textarea height
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(Math.max(el.scrollHeight, MIN_HEIGHT), MAX_HEIGHT)}px`;
  }, [input]);

  const handleSend = () => {
    if (isGenerating) return;
    if (!input.trim() && attachments.length === 0) return;
    if (!activeModel) {
      onOpenModelManager();
      return;
    }

    onSend(input, attachments.length > 0 ? attachments : undefined);
    setInput('');
    setAttachments([]);

    if (textareaRef.current) {
      textareaRef.current.style.height = `${MIN_HEIGHT}px`;
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;

    if (e.key === 'Escape' && isGenerating) {
      e.preventDefault();
      onStop();
      return;
    }

    if (enterToSend) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.size > 2 * 1024 * 1024) {
        alert(`File ${file.name} is larger than 2MB limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const textContent = (event.target?.result as string) || '';
        const newAttachment: Attachment = {
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type || 'text/plain',
          content: textContent,
        };
        setAttachments((prev) => [...prev, newAttachment]);
      };
      reader.readAsText(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const canSend = (input.trim().length > 0 || attachments.length > 0) && !isGenerating;

  return (
    // Fades into the chat; respects the iOS home-indicator inset
    <div className="w-full shrink-0 bg-linear-to-t from-background from-65% to-transparent px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:px-4">
      <div className="mx-auto w-full max-w-3xl">
        <div className="rounded-[28px] border border-border/15 bg-card shadow-sm transition-colors focus-within:border-border/30">
          {/* Attachment chips */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-4 pt-3">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/15 bg-muted py-1 pl-2.5 pr-1.5 text-xs text-foreground"
                >
                  <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="max-w-[160px] truncate">{att.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(att.id)}
                    className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground cursor-pointer"
                    title="Remove attachment"
                    aria-label="Remove attachment"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-1.5 p-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              className="hidden"
              accept=".txt,.md,.markdown,.json,.js,.ts,.tsx,.jsx,.py,.c,.cpp,.rs,.go,.java,.html,.css,.sql,.sh,.yaml,.yml,.log"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
              title="Attach text or code file"
              aria-label="Attach file"
            >
              <Paperclip className="h-5 w-5" />
            </button>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={1}
              aria-label="Message"
              // 16px on small screens stops iOS from zooming into the field
              className="min-h-10 min-w-0 flex-1 resize-none bg-transparent px-1 py-2 text-base leading-6 text-foreground placeholder:text-muted-foreground focus:outline-none md:text-[15px]"
            />

            {isGenerating ? (
              <button
                type="button"
                onClick={onStop}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-opacity hover:opacity-80 cursor-pointer"
                title="Stop generation (Esc)"
                aria-label="Stop generation"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 cursor-pointer"
                title={enterToSend ? 'Send message (Enter)' : 'Send message (Ctrl/Cmd+Enter)'}
                aria-label="Send message"
              >
                <ArrowUp className="h-5 w-5 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>

        <p className="mt-2 hidden select-none text-center text-xs text-muted-foreground sm:block">
          {enterToSend ? 'Enter to send · Shift+Enter for a new line' : 'Ctrl/Cmd+Enter to send'}
          {' · '}Chats are stored locally in your browser
        </p>
      </div>
    </div>
  );
};

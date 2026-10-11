import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  Paperclip,
  Square,
  X,
} from 'lucide-react';
import type { Attachment, GenerationState, ModelProfile } from '../../types';
import { ModelSelector } from '../models/ModelSelector';

interface ChatComposerProps {
  input: string;
  setInput: (value: string) => void;
  onSend: (content: string, attachments?: Attachment[]) => void;
  onStop: () => void;
  generationState: GenerationState;
  models: ModelProfile[];
  activeModel: ModelProfile | null;
  onSelectModel: (id: string) => void;
  onOpenModelManager: () => void;
  enterToSend?: boolean;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  input,
  setInput,
  onSend,
  onStop,
  generationState,
  models,
  activeModel,
  onSelectModel,
  onOpenModelManager,
  enterToSend = true,
}) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isGenerating = generationState === 'generating' || generationState === 'connecting';

  // Auto-resize textarea height
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const newHeight = Math.min(el.scrollHeight, 220);
    el.style.height = `${Math.max(newHeight, 48)}px`;
  }, [input]);

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
    } else {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSend();
      }
    }
  };

  const handleSend = () => {
    if (isGenerating) return;
    if (!input.trim() && attachments.length === 0) return;
    if (!activeModel && models.length === 0) {
      onOpenModelManager();
      return;
    }

    onSend(input, attachments.length > 0 ? attachments : undefined);
    setInput('');
    setAttachments([]);

    if (textareaRef.current) {
      textareaRef.current.style.height = '48px';
      textareaRef.current.focus();
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
    <div className="w-full max-w-3xl mx-auto px-4 pb-3 md:pb-5 pt-1">
      <div className="relative rounded-2xl border border-border/80 bg-card shadow-xs transition-all focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10">
        {/* Attachment chips preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3 pt-2.5 pb-1 border-b border-border/30">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] bg-muted/60 text-muted-foreground border border-border/40 font-mono"
              >
                <Paperclip className="w-3 h-3 text-primary" />
                <span className="truncate max-w-[180px]">{att.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(att.id)}
                  className="p-0.5 rounded hover:text-foreground text-muted-foreground transition cursor-pointer"
                  title="Remove attachment"
                  aria-label="Remove attachment"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            models.length === 0
              ? 'Connect a model to start conversation...'
              : 'Reply to Bamboo...'
          }
          rows={1}
          className="w-full px-4 pt-3 pb-2 text-sm text-foreground placeholder:text-muted-foreground/70 bg-transparent resize-none focus:outline-none leading-relaxed font-sans"
        />

        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 pb-2.5 pt-0.5">
          {/* Left tools: Attachment & Model Selector */}
          <div className="flex items-center gap-1.5">
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
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition cursor-pointer"
              title="Attach text or code file"
              aria-label="Attach file"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <ModelSelector
              models={models}
              activeModel={activeModel}
              onSelectModel={onSelectModel}
              onOpenModelManager={onOpenModelManager}
              compact
            />
          </div>

          {/* Right tool: Send or Stop button */}
          <div className="flex items-center gap-1.5">
            {isGenerating ? (
              <button
                type="button"
                onClick={onStop}
                className="w-8 h-8 rounded-lg bg-destructive text-destructive-foreground hover:opacity-90 transition shadow-xs cursor-pointer flex items-center justify-center"
                title="Stop generation (Esc)"
                aria-label="Stop generation"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                className={`w-8 h-8 rounded-lg transition-all shadow-xs flex items-center justify-center cursor-pointer ${
                  canSend
                    ? 'bg-primary text-primary-foreground hover:opacity-90'
                    : 'bg-muted/50 text-muted-foreground/30 cursor-not-allowed opacity-60'
                }`}
                title={enterToSend ? 'Send message (Enter)' : 'Send message (Cmd+Enter)'}
                aria-label="Send message"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-2 pt-1 text-[11px] text-muted-foreground/60 select-none font-sans">
        <span>
          {enterToSend ? 'Enter to send · Shift+Enter for newline' : 'Cmd+Enter to send'}
        </span>
        <span>Local-first · Offline capable</span>
      </div>
    </div>
  );
};

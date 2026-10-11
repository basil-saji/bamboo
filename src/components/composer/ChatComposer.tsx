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
    el.style.height = `${Math.max(newHeight, 52)}px`;
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Avoid triggering when IME composition is active (e.g. Japanese/Chinese typing)
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
      textareaRef.current.style.height = '52px';
      textareaRef.current.focus();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      // Read text/code/document files up to 2MB
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
    <div className="w-full max-w-3xl mx-auto px-4 pb-4 md:pb-6 pt-2">
      <div className="relative rounded-2xl border border-border bg-card shadow-md transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
        {/* Attachment chips preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3 pt-3 pb-1 border-b border-border/40">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-muted text-muted-foreground border border-border/50"
              >
                <Paperclip className="w-3 h-3" />
                <span className="truncate max-w-[180px] font-mono text-[11px]">{att.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(att.id)}
                  className="p-0.5 rounded-full hover:bg-card hover:text-foreground text-muted-foreground transition cursor-pointer"
                  title="Remove attachment"
                  aria-label="Remove attachment"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Text input area */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            models.length === 0
              ? 'Connect a model first to start chatting...'
              : 'Message Bamboo...'
          }
          rows={1}
          className="w-full px-4 pt-3 pb-2 text-sm text-foreground placeholder:text-muted-foreground bg-transparent resize-none focus:outline-none leading-relaxed"
        />

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
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
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
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
          <div className="flex items-center gap-2">
            {isGenerating ? (
              <button
                type="button"
                onClick={onStop}
                className="p-2 rounded-xl bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity shadow-xs cursor-pointer flex items-center justify-center"
                title="Stop generation (Esc)"
                aria-label="Stop generation"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                className={`p-2 rounded-xl transition-all shadow-xs flex items-center justify-center cursor-pointer ${
                  canSend
                    ? 'bg-primary text-primary-foreground hover:opacity-90'
                    : 'bg-muted text-muted-foreground/40 cursor-not-allowed opacity-60'
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

      <div className="flex items-center justify-between px-2 pt-1.5 text-[11px] text-muted-foreground/60 select-none">
        <span>
          {enterToSend ? 'Enter to send · Shift+Enter for newline' : 'Cmd+Enter to send · Enter for newline'}
        </span>
        <span>Local-first · No telemetry</span>
      </div>
    </div>
  );
};

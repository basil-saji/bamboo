import React, { useEffect, useRef } from 'react';
import type { Message, ModelProfile } from '../../types';
import { EmptyChatState } from './EmptyChatState';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  messages: Message[];
  models: ModelProfile[];
  activeModel: ModelProfile | null;
  onOpenModelManager: () => void;
  onSelectPrompt: (prompt: string) => void;
  onRegenerateMessage?: (id: string) => void;
  onEditUserMessage?: (id: string, newContent: string) => void;
  onDeleteMessage?: (id: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  models,
  activeModel,
  onOpenModelManager,
  onSelectPrompt,
  onRegenerateMessage,
  onEditUserMessage,
  onDeleteMessage,
}) => {
  const scrollBottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef<boolean>(true);

  // Check scroll position to determine if user scrolled up
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 120;
    shouldAutoScrollRef.current = isAtBottom;
  };

  useEffect(() => {
    if (shouldAutoScrollRef.current && scrollBottomRef.current) {
      scrollBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      // Reserve the glass header's height so the content centres in the visible area
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pt-[var(--header-h)]">
        <EmptyChatState
          models={models}
          activeModel={activeModel}
          onOpenModelManager={onOpenModelManager}
          onSelectPrompt={onSelectPrompt}
        />
      </div>
    );
  }

  // Find the last assistant message id for regeneration button
  let lastAssistantId: string | null = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant') {
      lastAssistantId = messages[i].id;
      break;
    }
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-[calc(var(--header-h)+1rem)] md:px-6"
    >
      <div className="max-w-3xl mx-auto flex flex-col justify-end min-h-full">
        {messages.map((m) => (
          <MessageItem
            key={m.id}
            message={m}
            isLastAssistant={m.id === lastAssistantId}
            onRegenerate={onRegenerateMessage}
            onEditUserMessage={onEditUserMessage}
            onDeleteMessage={onDeleteMessage}
          />
        ))}
        <div ref={scrollBottomRef} className="h-4" />
      </div>
    </div>
  );
};

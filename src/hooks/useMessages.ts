import { useCallback, useEffect, useRef, useState } from 'react';
import type { Attachment, GenerationState, Message, ModelProfile } from '../types';
import {
  buildChatMessages,
  streamChatCompletion,
} from '../lib/adapters/openai';
import {
  deleteMessage,
  deleteMessagesAfter,
  getConversationById,
  getMessagesByConversation,
  saveConversation,
  saveMessage,
} from '../lib/storage/db';

interface UseMessagesProps {
  conversationId: string | null;
  activeModel: ModelProfile | null;
  onAutoTitle?: (conversationId: string, title: string) => void;
  maxContextMessages?: number;
}

export function useMessages({
  conversationId,
  activeModel,
  onAutoTitle,
  maxContextMessages,
}: UseMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [generationState, setGenerationState] = useState<GenerationState>('ready');

  const abortControllerRef = useRef<AbortController | null>(null);
  const activeMessageIdRef = useRef<string | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const pendingChunkRef = useRef<string | null>(null);

  // Load messages whenever conversationId changes
  const loadMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    setIsLoading(true);
    try {
      const list = await getMessagesByConversation(conversationId);
      setMessages(list);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    // If generation is active when switching conversations, stop it cleanly
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setGenerationState('ready');
    loadMessages();
  }, [conversationId, loadMessages]);

  // Clean up animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Generate a clean title from the first message
  const deriveTitle = (text: string): string => {
    const clean = text.replace(/^[#\s*-_]+/, '').trim();
    if (!clean) return 'New conversation';
    const firstLine = clean.split('\n')[0].trim();
    if (firstLine.length <= 42) return firstLine;
    return firstLine.slice(0, 42).trim() + '...';
  };

  /**
   * Send a new message
   */
  const sendMessage = useCallback(
    async (content: string, attachments?: Attachment[]) => {
      if (!conversationId) return;
      if (!content.trim() && (!attachments || attachments.length === 0)) return;
      if (!activeModel) {
        throw new Error('No model configured. Please add and select a model profile first.');
      }

      // Check if this is the first message in the conversation to auto-title it
      const currentMessages = await getMessagesByConversation(conversationId);
      if (currentMessages.length === 0 && onAutoTitle) {
        const title = deriveTitle(content);
        onAutoTitle(conversationId, title);
        const conv = await getConversationById(conversationId);
        if (conv) {
          await saveConversation({ ...conv, title, updatedAt: Date.now() });
        }
      }

      const now = Date.now();
      const userMessage: Message = {
        id: crypto.randomUUID(),
        conversationId,
        role: 'user',
        content,
        attachments,
        timestamp: now,
      };

      // Save user message
      await saveMessage(userMessage);

      // Assistant placeholder
      const assistantMessageId = crypto.randomUUID();
      const assistantMessage: Message = {
        id: assistantMessageId,
        conversationId,
        role: 'assistant',
        content: '',
        modelProfileId: activeModel.id,
        modelName: activeModel.name,
        timestamp: now + 1,
        isStreaming: true,
      };

      await saveMessage(assistantMessage);

      // Update local state
      const updatedList = [...currentMessages, userMessage, assistantMessage];
      setMessages(updatedList);
      setGenerationState('connecting');

      // Setup AbortController
      const controller = new AbortController();
      abortControllerRef.current = controller;
      activeMessageIdRef.current = assistantMessageId;

      // Prepare payload
      const payloadMessages = buildChatMessages(
        [...currentMessages, userMessage],
        activeModel.systemPrompt,
        maxContextMessages
      );

      // Execute stream completion
      try {
        setGenerationState('generating');
        let fullGeneratedText = '';

        await streamChatCompletion(
          activeModel,
          payloadMessages,
          {
            onChunk: (accumulated) => {
              fullGeneratedText = accumulated;
              pendingChunkRef.current = accumulated;

              if (!animationFrameRef.current) {
                animationFrameRef.current = requestAnimationFrame(() => {
                  if (pendingChunkRef.current !== null) {
                    const text = pendingChunkRef.current;
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantMessageId ? { ...m, content: text, isStreaming: true } : m
                      )
                    );
                    pendingChunkRef.current = null;
                  }
                  animationFrameRef.current = null;
                });
              }
            },
            onComplete: async (finalText) => {
              if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
              }
              const finalTextContent = finalText || fullGeneratedText;
              const completedMsg: Message = {
                ...assistantMessage,
                content: finalTextContent,
                isStreaming: false,
                isInterrupted: false,
              };

              await saveMessage(completedMsg);
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantMessageId ? completedMsg : m))
              );
              setGenerationState('complete');
              abortControllerRef.current = null;
              activeMessageIdRef.current = null;

              // Update conversation timestamp
              const c = await getConversationById(conversationId);
              if (c) {
                await saveConversation({ ...c, updatedAt: Date.now() });
              }
            },
            onError: async (err) => {
              if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
              }
              const errorMsg: Message = {
                ...assistantMessage,
                content: fullGeneratedText,
                error: err.message,
                isStreaming: false,
                isInterrupted: false,
              };

              await saveMessage(errorMsg);
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantMessageId ? errorMsg : m))
              );
              setGenerationState('error');
              abortControllerRef.current = null;
              activeMessageIdRef.current = null;
            },
          },
          controller.signal,
          activeModel.systemPrompt
        );
      } catch (err: unknown) {
        if (!controller.signal.aborted) {
          setGenerationState('error');
        }
      }
    },
    [activeModel, conversationId, maxContextMessages, onAutoTitle]
  );

  /**
   * Stop generation immediately
   */
  const stopGeneration = useCallback(async () => {
    if (abortControllerRef.current) {
      setGenerationState('stopping');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      const activeId = activeMessageIdRef.current;
      if (activeId) {
        setMessages((prev) => {
          const target = prev.find((m) => m.id === activeId);
          if (target) {
            const interruptedMsg: Message = {
              ...target,
              isStreaming: false,
              isInterrupted: true,
            };
            saveMessage(interruptedMsg);
            return prev.map((m) => (m.id === activeId ? interruptedMsg : m));
          }
          return prev;
        });
      }

      setGenerationState('interrupted');
      activeMessageIdRef.current = null;
    }
  }, []);

  /**
   * Regenerate assistant message
   */
  const regenerateMessage = useCallback(
    async (messageId: string) => {
      if (!conversationId || !activeModel) return;

      const currentMessages = await getMessagesByConversation(conversationId);
      const targetIndex = currentMessages.findIndex((m) => m.id === messageId);
      if (targetIndex === -1) return;

      // Identify the prior messages up to this point
      const priorMessages = currentMessages.slice(0, targetIndex);

      // Update existing message placeholder or delete and replace
      const targetMessage = currentMessages[targetIndex];
      const resetAssistantMsg: Message = {
        ...targetMessage,
        content: '',
        error: undefined,
        isStreaming: true,
        isInterrupted: false,
        modelProfileId: activeModel.id,
        modelName: activeModel.name,
      };

      await saveMessage(resetAssistantMsg);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? resetAssistantMsg : m))
      );
      setGenerationState('connecting');

      const controller = new AbortController();
      abortControllerRef.current = controller;
      activeMessageIdRef.current = messageId;

      const payloadMessages = buildChatMessages(
        priorMessages,
        activeModel.systemPrompt,
        maxContextMessages
      );

      try {
        setGenerationState('generating');
        let fullGeneratedText = '';

        await streamChatCompletion(
          activeModel,
          payloadMessages,
          {
            onChunk: (accumulated) => {
              fullGeneratedText = accumulated;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === messageId ? { ...m, content: accumulated, isStreaming: true } : m
                )
              );
            },
            onComplete: async (finalText) => {
              const completedMsg: Message = {
                ...resetAssistantMsg,
                content: finalText || fullGeneratedText,
                isStreaming: false,
                isInterrupted: false,
              };
              await saveMessage(completedMsg);
              setMessages((prev) =>
                prev.map((m) => (m.id === messageId ? completedMsg : m))
              );
              setGenerationState('complete');
              abortControllerRef.current = null;
              activeMessageIdRef.current = null;
            },
            onError: async (err) => {
              const errorMsg: Message = {
                ...resetAssistantMsg,
                content: fullGeneratedText,
                error: err.message,
                isStreaming: false,
              };
              await saveMessage(errorMsg);
              setMessages((prev) =>
                prev.map((m) => (m.id === messageId ? errorMsg : m))
              );
              setGenerationState('error');
              abortControllerRef.current = null;
              activeMessageIdRef.current = null;
            },
          },
          controller.signal,
          activeModel.systemPrompt
        );
      } catch {
        // Handled
      }
    },
    [activeModel, conversationId, maxContextMessages]
  );

  /**
   * Edit a user message and re-generate from that branch
   */
  const editUserMessage = useCallback(
    async (messageId: string, newContent: string) => {
      if (!conversationId || !activeModel) return;

      const currentMessages = await getMessagesByConversation(conversationId);
      const targetIndex = currentMessages.findIndex((m) => m.id === messageId);
      if (targetIndex === -1) return;

      const target = currentMessages[targetIndex];
      // Update target message
      const updatedUserMsg: Message = {
        ...target,
        content: newContent,
      };

      await saveMessage(updatedUserMsg);

      // Delete all messages after this message timestamp
      await deleteMessagesAfter(conversationId, target.timestamp);

      // Now create assistant reply
      const assistantMessageId = crypto.randomUUID();
      const assistantMessage: Message = {
        id: assistantMessageId,
        conversationId,
        role: 'assistant',
        content: '',
        modelProfileId: activeModel.id,
        modelName: activeModel.name,
        timestamp: target.timestamp + 1,
        isStreaming: true,
      };

      await saveMessage(assistantMessage);

      // Prior messages up to and including the updated message
      const priorMessages = [...currentMessages.slice(0, targetIndex), updatedUserMsg];
      setMessages([...priorMessages, assistantMessage]);

      const controller = new AbortController();
      abortControllerRef.current = controller;
      activeMessageIdRef.current = assistantMessageId;
      setGenerationState('connecting');

      const payloadMessages = buildChatMessages(
        priorMessages,
        activeModel.systemPrompt,
        maxContextMessages
      );

      try {
        setGenerationState('generating');
        let fullGeneratedText = '';

        await streamChatCompletion(
          activeModel,
          payloadMessages,
          {
            onChunk: (accumulated) => {
              fullGeneratedText = accumulated;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId ? { ...m, content: accumulated, isStreaming: true } : m
                )
              );
            },
            onComplete: async (finalText) => {
              const completedMsg: Message = {
                ...assistantMessage,
                content: finalText || fullGeneratedText,
                isStreaming: false,
              };
              await saveMessage(completedMsg);
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantMessageId ? completedMsg : m))
              );
              setGenerationState('complete');
              abortControllerRef.current = null;
              activeMessageIdRef.current = null;
            },
            onError: async (err) => {
              const errorMsg: Message = {
                ...assistantMessage,
                content: fullGeneratedText,
                error: err.message,
                isStreaming: false,
              };
              await saveMessage(errorMsg);
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantMessageId ? errorMsg : m))
              );
              setGenerationState('error');
              abortControllerRef.current = null;
              activeMessageIdRef.current = null;
            },
          },
          controller.signal,
          activeModel.systemPrompt
        );
      } catch {
        // Handled
      }
    },
    [activeModel, conversationId, maxContextMessages]
  );

  /**
   * Clear context boundary marker:
   * Inserts an explicit boundary so previous messages are excluded from future completion payloads.
   */
  const clearContextBoundary = useCallback(async () => {
    if (!conversationId) return;

    const boundaryMessage: Message = {
      id: crypto.randomUUID(),
      conversationId,
      role: 'system',
      content: 'Context cleared. Prior messages in this conversation are preserved for reference but will not be sent to the model in future requests.',
      timestamp: Date.now(),
      isContextBoundary: true,
    };

    await saveMessage(boundaryMessage);
    await loadMessages();
  }, [conversationId, loadMessages]);

  /**
   * Delete a single message
   */
  const removeMessage = useCallback(
    async (messageId: string) => {
      await deleteMessage(messageId);
      await loadMessages();
    },
    [loadMessages]
  );

  /**
   * Export conversation to clean Markdown
   */
  const exportToMarkdown = useCallback(
    async (convTitle = 'conversation'): Promise<string> => {
      if (!conversationId) return '';
      const list = await getMessagesByConversation(conversationId);
      let md = `# ${convTitle}\n\n`;
      md += `*Exported from Bamboo on ${new Date().toLocaleString()}*\n\n---\n\n`;

      for (const m of list) {
        if (m.isContextBoundary) {
          md += `\n> **[Context Boundary Cleared]**\n\n---\n\n`;
          continue;
        }

        const roleLabel = m.role === 'user' ? 'User' : m.role === 'assistant' ? `Assistant (${m.modelName || 'Model'})` : 'System';
        md += `### ${roleLabel}\n\n${m.content}\n\n`;
        if (m.attachments && m.attachments.length > 0) {
          md += `*Attachments: ${m.attachments.map((a) => a.name).join(', ')}*\n\n`;
        }
      }

      return md;
    },
    [conversationId]
  );

  return {
    messages,
    isLoading,
    generationState,
    sendMessage,
    stopGeneration,
    regenerateMessage,
    editUserMessage,
    clearContextBoundary,
    removeMessage,
    exportToMarkdown,
    reloadMessages: loadMessages,
  };
}

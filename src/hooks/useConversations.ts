import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Conversation } from '../types';
import {
  deleteConversation,
  getAllConversations,
  getConversationById,
  saveConversation,
} from '../lib/storage/db';

const ACTIVE_CONV_KEY = 'bamboo_active_conversation_id';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ACTIVE_CONV_KEY);
    }
    return null;
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterArchived, setFilterArchived] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await getAllConversations();
      setConversations(list);

      // Verify active conversation exists
      if (list.length === 0) {
        setActiveConversationIdState(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(ACTIVE_CONV_KEY);
        }
      } else {
        const storedId = typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_CONV_KEY) : null;
        const exists = list.some((c) => c.id === storedId);
        if (!exists) {
          // If stored doesn't exist, leave null or select first unarchived
          setActiveConversationIdState(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem(ACTIVE_CONV_KEY);
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const setActiveConversationId = useCallback((id: string | null) => {
    setActiveConversationIdState(id);
    if (id) {
      localStorage.setItem(ACTIVE_CONV_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_CONV_KEY);
    }
  }, []);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

  const createConversation = useCallback(
    async (initialTitle = 'New conversation', modelProfileId?: string): Promise<Conversation> => {
      const now = Date.now();
      const newConv: Conversation = {
        id: crypto.randomUUID(),
        title: initialTitle,
        modelProfileId,
        createdAt: now,
        updatedAt: now,
        isPinned: false,
        isArchived: false,
      };

      await saveConversation(newConv);
      await loadConversations();
      setActiveConversationId(newConv.id);
      return newConv;
    },
    [loadConversations, setActiveConversationId]
  );

  const updateTitle = useCallback(
    async (id: string, newTitle: string): Promise<void> => {
      const conv = await getConversationById(id);
      if (!conv) return;
      await saveConversation({
        ...conv,
        title: newTitle.trim() || 'Untitled',
        updatedAt: Date.now(),
      });
      await loadConversations();
    },
    [loadConversations]
  );

  const togglePin = useCallback(
    async (id: string): Promise<void> => {
      const conv = await getConversationById(id);
      if (!conv) return;
      await saveConversation({
        ...conv,
        isPinned: !conv.isPinned,
        updatedAt: Date.now(),
      });
      await loadConversations();
    },
    [loadConversations]
  );

  const toggleArchive = useCallback(
    async (id: string): Promise<void> => {
      const conv = await getConversationById(id);
      if (!conv) return;
      const nextArchived = !conv.isArchived;
      await saveConversation({
        ...conv,
        isArchived: nextArchived,
        updatedAt: Date.now(),
      });
      await loadConversations();
      // If archiving current active conversation, unset active
      if (nextArchived && activeConversationId === id) {
        setActiveConversationId(null);
      }
    },
    [activeConversationId, loadConversations, setActiveConversationId]
  );

  const removeConversation = useCallback(
    async (id: string): Promise<void> => {
      await deleteConversation(id);
      await loadConversations();
      if (activeConversationId === id) {
        setActiveConversationId(null);
      }
    },
    [activeConversationId, loadConversations, setActiveConversationId]
  );

  // Filter conversations based on search and archive status
  const filteredConversations = useMemo(() => {
    let result = conversations;

    if (!filterArchived) {
      result = result.filter((c) => !c.isArchived);
    } else {
      result = result.filter((c) => c.isArchived);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((c) => c.title.toLowerCase().includes(q));
    }

    return result;
  }, [conversations, filterArchived, searchQuery]);

  return {
    conversations,
    filteredConversations,
    activeConversation,
    activeConversationId,
    searchQuery,
    setSearchQuery,
    filterArchived,
    setFilterArchived,
    isLoading,
    setActiveConversationId,
    createConversation,
    updateTitle,
    togglePin,
    toggleArchive,
    removeConversation,
    reloadConversations: loadConversations,
  };
}

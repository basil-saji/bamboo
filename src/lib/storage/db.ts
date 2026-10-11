import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ModelProfile, Conversation, Message, PromptPreset, UserSettings } from '../../types';

export const DB_NAME = 'bamboo_workspace';
export const DB_VERSION = 1;

export interface BambooDB extends DBSchema {
  models: {
    key: string;
    value: ModelProfile;
    indexes: {
      'by-updated': number;
      'by-default': number;
    };
  };
  conversations: {
    key: string;
    value: Conversation;
    indexes: {
      'by-updated': number;
      'by-pinned': number;
      'by-archived': number;
    };
  };
  messages: {
    key: string;
    value: Message;
    indexes: {
      'by-conversation': string;
      'by-timestamp': number;
    };
  };
  prompts: {
    key: string;
    value: PromptPreset;
    indexes: {
      'by-created': number;
    };
  };
  settings: {
    key: string;
    value: UserSettings;
  };
}

let dbPromise: Promise<IDBPDatabase<BambooDB>> | null = null;

export function getDatabase(): Promise<IDBPDatabase<BambooDB>> {
  if (!dbPromise) {
    dbPromise = openDB<BambooDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Models Store
        if (!db.objectStoreNames.contains('models')) {
          const modelStore = db.createObjectStore('models', { keyPath: 'id' });
          modelStore.createIndex('by-updated', 'updatedAt');
          modelStore.createIndex('by-default', 'isDefault');
        }

        // Conversations Store
        if (!db.objectStoreNames.contains('conversations')) {
          const convStore = db.createObjectStore('conversations', { keyPath: 'id' });
          convStore.createIndex('by-updated', 'updatedAt');
          convStore.createIndex('by-pinned', 'isPinned');
          convStore.createIndex('by-archived', 'isArchived');
        }

        // Messages Store
        if (!db.objectStoreNames.contains('messages')) {
          const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
          msgStore.createIndex('by-conversation', 'conversationId');
          msgStore.createIndex('by-timestamp', 'timestamp');
        }

        // Prompts Store
        if (!db.objectStoreNames.contains('prompts')) {
          const promptStore = db.createObjectStore('prompts', { keyPath: 'id' });
          promptStore.createIndex('by-created', 'createdAt');
        }

        // Settings Store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      },
      blocked() {
        console.warn('Database open blocked by another tab');
      },
      blocking() {
        console.warn('Database connection blocking an upgrade');
      },
    });
  }
  return dbPromise;
}

// Reset db connection (useful for tests or clear-all-data)
export function resetDbConnection() {
  dbPromise = null;
}

// --- Model Profile Operations ---
export async function getAllModels(): Promise<ModelProfile[]> {
  const db = await getDatabase();
  return db.getAll('models');
}

export async function getModelById(id: string): Promise<ModelProfile | undefined> {
  const db = await getDatabase();
  return db.get('models', id);
}

export async function saveModel(model: ModelProfile): Promise<void> {
  const db = await getDatabase();
  // If setting this model as default, unset other defaults
  if (model.isDefault) {
    const all = await db.getAll('models');
    const tx = db.transaction('models', 'readwrite');
    for (const m of all) {
      if (m.id !== model.id && m.isDefault) {
        await tx.store.put({ ...m, isDefault: false });
      }
    }
    await tx.store.put(model);
    await tx.done;
  } else {
    await db.put('models', model);
  }
}

export async function deleteModel(id: string): Promise<void> {
  const db = await getDatabase();
  await db.delete('models', id);
}

// --- Conversation Operations ---
export async function getAllConversations(): Promise<Conversation[]> {
  const db = await getDatabase();
  const convs = await db.getAll('conversations');
  return convs.sort((a, b) => {
    // Pinned first, then by updatedAt descending
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.updatedAt - a.updatedAt;
  });
}

export async function getConversationById(id: string): Promise<Conversation | undefined> {
  const db = await getDatabase();
  return db.get('conversations', id);
}

export async function saveConversation(conv: Conversation): Promise<void> {
  const db = await getDatabase();
  await db.put('conversations', conv);
}

export async function deleteConversation(id: string): Promise<void> {
  const db = await getDatabase();
  const tx = db.transaction(['conversations', 'messages'], 'readwrite');
  await tx.objectStore('conversations').delete(id);

  // Cascade delete messages
  const msgStore = tx.objectStore('messages');
  const index = msgStore.index('by-conversation');
  let cursor = await index.openCursor(IDBKeyRange.only(id));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

// --- Message Operations ---
export async function getMessagesByConversation(conversationId: string): Promise<Message[]> {
  const db = await getDatabase();
  const tx = db.transaction('messages', 'readonly');
  const index = tx.store.index('by-conversation');
  const messages = await index.getAll(conversationId);
  return messages.sort((a, b) => a.timestamp - b.timestamp);
}

export async function saveMessage(msg: Message): Promise<void> {
  const db = await getDatabase();
  await db.put('messages', msg);
}

export async function deleteMessage(id: string): Promise<void> {
  const db = await getDatabase();
  await db.delete('messages', id);
}

/**
 * Truncate messages in conversation starting after a specific message id, or starting at a message id
 */
export async function deleteMessagesAfter(conversationId: string, timestamp: number): Promise<void> {
  const db = await getDatabase();
  const tx = db.transaction('messages', 'readwrite');
  const index = tx.store.index('by-conversation');
  let cursor = await index.openCursor(IDBKeyRange.only(conversationId));
  while (cursor) {
    if (cursor.value.timestamp > timestamp) {
      await cursor.delete();
    }
    cursor = await cursor.continue();
  }
  await tx.done;
}

// --- Prompt Presets Operations ---
export async function getAllPrompts(): Promise<PromptPreset[]> {
  const db = await getDatabase();
  return db.getAll('prompts');
}

export async function savePrompt(prompt: PromptPreset): Promise<void> {
  const db = await getDatabase();
  await db.put('prompts', prompt);
}

export async function deletePrompt(id: string): Promise<void> {
  const db = await getDatabase();
  await db.delete('prompts', id);
}

// --- User Settings Operations ---
export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  fontSize: 'base',
  enterToSend: true,
  defaultSystemPrompt: '',
  defaultTemperature: 0.7,
  defaultTopP: 0.9,
  enableStreaming: true,
  maxContextMessages: 0, // unlimited
};

export async function getSettings(): Promise<UserSettings> {
  try {
    const db = await getDatabase();
    const settings = await db.get('settings', 'user_preferences');
    return settings ? { ...DEFAULT_SETTINGS, ...settings } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  const db = await getDatabase();
  await db.put('settings', settings, 'user_preferences');
}

// Clear all local application data
export async function clearAllData(): Promise<void> {
  const db = await getDatabase();
  const tx = db.transaction(['models', 'conversations', 'messages', 'prompts', 'settings'], 'readwrite');
  await tx.objectStore('models').clear();
  await tx.objectStore('conversations').clear();
  await tx.objectStore('messages').clear();
  await tx.objectStore('prompts').clear();
  await tx.objectStore('settings').clear();
  await tx.done;
}

// Query storage usage estimate
export async function getStorageEstimate(): Promise<{ usage: number; quota: number }> {
  if (navigator.storage && navigator.storage.estimate) {
    const est = await navigator.storage.estimate();
    return { usage: est.usage || 0, quota: est.quota || 0 };
  }
  return { usage: 0, quota: 0 };
}

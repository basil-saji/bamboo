import type { BackupData, Conversation, Message, ModelProfile, PromptPreset, UserSettings } from '../../types';
import {
  clearAllData,
  getAllConversations,
  getAllModels,
  getAllPrompts,
  getDatabase,
  getSettings,
  saveConversation,
  saveMessage,
  saveModel,
  savePrompt,
  saveSettings,
} from '../storage/db';

export interface ExportOptions {
  includeApiKeys: boolean;
}

/**
 * Export complete local database to structured JSON
 */
export async function exportBackup(options: ExportOptions = { includeApiKeys: false }): Promise<BackupData> {
  const db = await getDatabase();
  const models = await getAllModels();
  const conversations = await getAllConversations();
  const prompts = await getAllPrompts();
  const settings = await getSettings();

  // Fetch all messages
  const messages: Message[] = await db.getAll('messages');

  const sanitizedModels = models.map((m) => {
    const copy = { ...m };
    if (!options.includeApiKeys) {
      delete copy.apiKey;
    }
    return copy;
  });

  const backup: BackupData = {
    version: 1,
    app: 'bamboo',
    exportedAt: Date.now(),
    models: sanitizedModels,
    conversations,
    messages,
    prompts,
    settings,
  };

  return backup;
}

/**
 * Validate imported JSON schema and contents
 */
export function validateBackup(json: unknown): { isValid: boolean; error?: string; data?: BackupData } {
  if (!json || typeof json !== 'object') {
    return { isValid: false, error: 'Uploaded file is not a valid JSON object.' };
  }

  const obj = json as Partial<BackupData>;

  if (obj.app !== 'bamboo') {
    return { isValid: false, error: 'Invalid backup file: Not a recognized Bamboo workspace export.' };
  }

  if (obj.version !== 1) {
    return { isValid: false, error: `Unsupported backup version (${obj.version}). Only version 1 is supported.` };
  }

  if (!Array.isArray(obj.models)) {
    return { isValid: false, error: 'Corrupt backup file: Missing or invalid models list.' };
  }

  if (!Array.isArray(obj.conversations)) {
    return { isValid: false, error: 'Corrupt backup file: Missing or invalid conversations list.' };
  }

  if (!Array.isArray(obj.messages)) {
    return { isValid: false, error: 'Corrupt backup file: Missing or invalid messages list.' };
  }

  // Validate item basic structures
  for (const model of obj.models) {
    if (!model.id || !model.name || !model.modelId || !model.baseUrl) {
      return { isValid: false, error: 'Corrupt model record found in backup.' };
    }
  }

  for (const conv of obj.conversations) {
    if (!conv.id || typeof conv.title !== 'string') {
      return { isValid: false, error: 'Corrupt conversation record found in backup.' };
    }
  }

  for (const msg of obj.messages) {
    if (!msg.id || !msg.conversationId || !msg.role || typeof msg.content !== 'string') {
      return { isValid: false, error: 'Corrupt message record found in backup.' };
    }
  }

  return { isValid: true, data: obj as BackupData };
}

export interface ImportResult {
  success: boolean;
  importedModels: number;
  importedConversations: number;
  importedMessages: number;
  importedPrompts: number;
  error?: string;
}

/**
 * Import backup with either 'merge' or 'replace' mode
 */
export async function importBackup(
  backup: BackupData,
  mode: 'merge' | 'replace'
): Promise<ImportResult> {
  const validation = validateBackup(backup);
  if (!validation.isValid || !validation.data) {
    return {
      success: false,
      importedModels: 0,
      importedConversations: 0,
      importedMessages: 0,
      importedPrompts: 0,
      error: validation.error || 'Backup validation failed.',
    };
  }

  try {
    if (mode === 'replace') {
      await clearAllData();
    }

    let modelCount = 0;
    let convCount = 0;
    let msgCount = 0;
    let promptCount = 0;

    // Save models
    for (const m of backup.models) {
      await saveModel(m);
      modelCount++;
    }

    // Save conversations
    for (const c of backup.conversations) {
      await saveConversation(c);
      convCount++;
    }

    // Save messages
    for (const m of backup.messages) {
      await saveMessage(m);
      msgCount++;
    }

    // Save prompt presets if any
    if (Array.isArray(backup.prompts)) {
      for (const p of backup.prompts) {
        await savePrompt(p);
        promptCount++;
      }
    }

    // Save settings if present
    if (backup.settings) {
      await saveSettings(backup.settings);
    }

    return {
      success: true,
      importedModels: modelCount,
      importedConversations: convCount,
      importedMessages: msgCount,
      importedPrompts: promptCount,
    };
  } catch (err: unknown) {
    return {
      success: false,
      importedModels: 0,
      importedConversations: 0,
      importedMessages: 0,
      importedPrompts: 0,
      error: `Failed to import data: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

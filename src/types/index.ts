export type Role = 'user' | 'assistant' | 'system';

export interface ModelProfile {
  id: string;
  name: string; // User-defined display name
  modelId: string; // Backend model identifier (e.g., 'llama3.2', 'qwen2.5:7b')
  baseUrl: string; // e.g., 'http://localhost:11434/v1' or 'https://xxxx.ngrok-free.app/v1'
  customChatPath?: string; // Optional override path if not '/chat/completions'
  apiKey?: string;
  description?: string;
  systemPrompt?: string;
  temperature: number; // 0.0 - 2.0 (default 0.7)
  topP: number; // 0.0 - 1.0 (default 0.9)
  maxTokens?: number;
  streaming: boolean; // default true
  isDefault?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface UserProfile {
  username: string; // e.g. "User" or custom name
  avatarInitials: string; // e.g. "BA" or "U"
  bio?: string;
  createdAt: number;
  updatedAt: number;
  // Local lock credentials (PBKDF2 via Web Crypto)
  hasPasscode?: boolean;
  passcodeSaltHex?: string;
  passcodeHashHex?: string;
  passcodeIterations?: number;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  content: string; // Extracted text
}

export interface Message {
  id: string;
  conversationId: string;
  role: Role;
  content: string;
  attachments?: Attachment[];
  modelProfileId?: string;
  modelName?: string;
  timestamp: number;
  isStreaming?: boolean;
  isInterrupted?: boolean;
  error?: string;
  // If clear context was triggered before this message
  isContextBoundary?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  modelProfileId?: string; // Last or preferred model profile id
  createdAt: number;
  updatedAt: number;
  isPinned?: boolean;
  isArchived?: boolean;
  tags?: string[];
  systemPromptOverride?: string;
}

export interface PromptPreset {
  id: string;
  title: string;
  content: string;
  description?: string;
  category?: string;
  createdAt: number;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface UserSettings {
  theme: ThemeMode;
  fontSize: 'sm' | 'base' | 'lg';
  enterToSend: boolean; // true = Enter sends, Shift+Enter newline; false = Cmd/Ctrl+Enter sends
  defaultSystemPrompt: string;
  defaultTemperature: number;
  defaultTopP: number;
  defaultMaxTokens?: number;
  enableStreaming: boolean;
  maxContextMessages?: number; // 0 or undefined = unlimited
}

export interface BackupData {
  version: 1;
  app: 'bamboo';
  exportedAt: number;
  models: ModelProfile[];
  conversations: Conversation[];
  messages: Message[];
  prompts: PromptPreset[];
  settings?: UserSettings;
  profile?: UserProfile;
}

export type GenerationState =
  | 'ready'
  | 'connecting'
  | 'generating'
  | 'stopping'
  | 'complete'
  | 'interrupted'
  | 'error';

// Diagnostic action results
export interface DiagnosticResult {
  type: 'discovery' | 'chat' | 'streaming';
  success: boolean;
  effectiveUrl: string;
  httpStatus?: number;
  elapsedMs: number;
  message: string;
  details?: string;
  discoveredModels?: string[];
  responseSnippet?: string;
  nextStep?: string;
}

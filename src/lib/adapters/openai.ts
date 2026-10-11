import type { Message, ModelProfile } from '../../types';
import { SSEParser } from '../streaming/sse-parser';

export interface OpenAIModelItem {
  id: string;
  object?: string;
  owned_by?: string;
}

export interface OpenAIModelsResponse {
  data: OpenAIModelItem[];
}

export interface ChatCompletionPayloadMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionCallbacks {
  onChunk: (text: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

/**
 * Carefully normalizes the user-entered base URL.
 * Examples:
 * - "http://localhost:11434" -> "http://localhost:11434/v1"
 * - "http://localhost:11434/" -> "http://localhost:11434/v1"
 * - "http://localhost:11434/v1" -> "http://localhost:11434/v1"
 * - "http://localhost:11434/v1/" -> "http://localhost:11434/v1"
 * - "https://api.openai.com/v1" -> "https://api.openai.com/v1"
 */
export function normalizeBaseUrl(rawUrl: string): string {
  let url = rawUrl.trim();
  if (!url) return '';
  // Remove trailing slashes
  while (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  // If no protocol is provided, assume http for localhost / 127.0.0.1, https otherwise
  if (!/^https?:\/\//i.test(url)) {
    if (url.startsWith('localhost') || url.startsWith('127.0.0.1')) {
      url = 'http://' + url;
    } else {
      url = 'https://' + url;
    }
  }
  // Check if /v1 is already present
  if (!/\/v1$/i.test(url) && !/\/v1\//i.test(url)) {
    url = `${url}/v1`;
  }
  return url;
}

/**
 * Construct safe authorization and request headers
 */
export function getRequestHeaders(apiKey?: string): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  };
  if (apiKey && apiKey.trim().length > 0) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
  }
  return headers;
}

/**
 * Fetch available model IDs from standard GET /v1/models endpoint
 */
export async function fetchRemoteModels(
  baseUrl: string,
  apiKey?: string,
  signal?: AbortSignal
): Promise<{ success: boolean; models: string[]; error?: string }> {
  const normalized = normalizeBaseUrl(baseUrl);
  const targetUrl = `${normalized}/models`;

  try {
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: getRequestHeaders(apiKey),
      signal,
    });

    if (!res.ok) {
      if (res.status === 401) {
        return { success: false, models: [], error: 'Authentication failed (401 Unauthorized). Verify your API key if required.' };
      }
      if (res.status === 404) {
        return { success: false, models: [], error: 'Endpoint returned 404 Not Found. Please verify the base URL path.' };
      }
      return { success: false, models: [], error: `Server returned error status HTTP ${res.status}: ${res.statusText}` };
    }

    const data = await res.json();
    let modelList: string[] = [];

    if (Array.isArray(data?.data)) {
      modelList = data.data.map((m: OpenAIModelItem) => m.id).filter(Boolean);
    } else if (Array.isArray(data?.models)) {
      // Ollama native /api/tags or alternate shape compatibility
      modelList = data.models.map((m: { name?: string; id?: string }) => m.name || m.id || '').filter(Boolean);
    } else if (Array.isArray(data)) {
      modelList = data.map((m: OpenAIModelItem | string) => (typeof m === 'string' ? m : m.id)).filter(Boolean);
    }

    return {
      success: true,
      models: modelList.sort(),
    };
  } catch (err: unknown) {
    const msg = getFriendlyErrorMessage(err, targetUrl);
    return { success: false, models: [], error: msg };
  }
}

/**
 * Test connectivity to endpoint
 */
export async function testEndpointConnection(
  baseUrl: string,
  apiKey?: string
): Promise<{ success: boolean; message: string; modelCount?: number }> {
  const result = await fetchRemoteModels(baseUrl, apiKey);
  if (result.success) {
    return {
      success: true,
      message: `Successfully connected. Discovered ${result.models.length} model(s).`,
      modelCount: result.models.length,
    };
  }
  return {
    success: false,
    message: result.error || 'Connection failed.',
  };
}

/**
 * Filter and build payload messages respecting context boundary and system prompts
 */
export function buildChatMessages(
  messages: Message[],
  systemPrompt?: string,
  maxContextMessages?: number
): ChatCompletionPayloadMessage[] {
  // Find the last context boundary index
  let startIndex = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].isContextBoundary) {
      startIndex = i;
      break;
    }
  }

  let activeMessages = messages.slice(startIndex);

  // If maxContextMessages is set and > 0
  if (maxContextMessages && maxContextMessages > 0 && activeMessages.length > maxContextMessages) {
    activeMessages = activeMessages.slice(activeMessages.length - maxContextMessages);
  }

  const payload: ChatCompletionPayloadMessage[] = [];

  // Add system prompt if present
  if (systemPrompt && systemPrompt.trim()) {
    payload.push({
      role: 'system',
      content: systemPrompt.trim(),
    });
  }

  for (const m of activeMessages) {
    // Skip empty or error messages
    if (!m.content && (!m.attachments || m.attachments.length === 0)) continue;
    if (m.role !== 'user' && m.role !== 'assistant' && m.role !== 'system') continue;

    let content = m.content;
    // Format attached text documents if any
    if (m.attachments && m.attachments.length > 0) {
      const attachmentsText = m.attachments
        .map((a) => `[Attachment: ${a.name}]\n${a.content}\n[/Attachment]`)
        .join('\n\n');
      content = attachmentsText ? `${attachmentsText}\n\n${content}` : content;
    }

    payload.push({
      role: m.role,
      content,
    });
  }

  return payload;
}

/**
 * Execute streaming OpenAI-compatible chat completion request
 */
export async function streamChatCompletion(
  profile: ModelProfile,
  payloadMessages: ChatCompletionPayloadMessage[],
  callbacks: CompletionCallbacks,
  signal: AbortSignal,
  systemPromptOverride?: string
): Promise<void> {
  const normalized = normalizeBaseUrl(profile.baseUrl);
  const targetUrl = `${normalized}/chat/completions`;

  const body: Record<string, unknown> = {
    model: profile.modelId,
    messages: payloadMessages,
    stream: profile.streaming !== false,
    temperature: profile.temperature ?? 0.7,
    top_p: profile.topP ?? 0.9,
  };

  if (profile.maxTokens && profile.maxTokens > 0) {
    body.max_tokens = profile.maxTokens;
  }

  let response: Response;
  try {
    response = await fetch(targetUrl, {
      method: 'POST',
      headers: getRequestHeaders(profile.apiKey),
      body: JSON.stringify(body),
      signal,
    });
  } catch (err: unknown) {
    if (signal.aborted) {
      return;
    }
    const msg = getFriendlyErrorMessage(err, targetUrl);
    callbacks.onError(new Error(msg));
    return;
  }

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson?.error?.message || JSON.stringify(errJson);
    } catch {
      try {
        errorDetail = await response.text();
      } catch {
        errorDetail = '';
      }
    }

    let friendly = `HTTP ${response.status} ${response.statusText}`;
    if (response.status === 401) {
      friendly = 'Authentication failed (401 Unauthorized). Please check your API key.';
    } else if (response.status === 404) {
      friendly = `Model "${profile.modelId}" or endpoint was not found (404). Verify the model ID exists on your model server.`;
    } else if (response.status === 429) {
      friendly = 'Rate limit or resource quota exceeded (429).';
    }

    if (errorDetail) {
      friendly += `: ${errorDetail}`;
    }

    callbacks.onError(new Error(friendly));
    return;
  }

  // Non-streaming fallback if streaming is disabled or not returned as event stream
  const contentType = response.headers.get('content-type') || '';
  if (!profile.streaming || !contentType.includes('text/event-stream')) {
    try {
      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content || '';
      callbacks.onChunk(content);
      callbacks.onComplete(content);
      return;
    } catch (err: unknown) {
      callbacks.onError(new Error(`Failed to parse non-streaming response: ${err instanceof Error ? err.message : String(err)}`));
      return;
    }
  }

  if (!response.body) {
    callbacks.onError(new Error('Response body is empty.'));
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  const sseParser = new SSEParser();
  let accumulated = '';

  try {
    while (true) {
      if (signal.aborted) {
        break;
      }

      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      const chunkText = decoder.decode(value, { stream: true });
      const events = sseParser.feed(chunkText);

      for (const event of events) {
        if (event.data === '[DONE]') {
          continue;
        }

        try {
          const parsed = JSON.parse(event.data);
          // Check for errors returned in stream
          if (parsed.error) {
            throw new Error(parsed.error.message || JSON.stringify(parsed.error));
          }

          const delta = parsed?.choices?.[0]?.delta?.content;
          if (typeof delta === 'string' && delta.length > 0) {
            accumulated += delta;
            callbacks.onChunk(accumulated);
          }
        } catch (parseErr: unknown) {
          // If JSON parse error on chunk, ignore malformed heartbeat or pass through
          if (parseErr instanceof Error && parseErr.message.includes('JSON')) {
            continue;
          }
          throw parseErr;
        }
      }
    }

    callbacks.onComplete(accumulated);
  } catch (err: unknown) {
    if (signal.aborted) {
      callbacks.onComplete(accumulated);
      return;
    }
    const msg = err instanceof Error ? err.message : String(err);
    callbacks.onError(new Error(msg));
  } finally {
    reader.releaseLock();
  }
}

function getFriendlyErrorMessage(err: unknown, targetUrl: string): string {
  if (err instanceof Error) {
    if (err.name === 'AbortError') {
      return 'Request was aborted.';
    }
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      return (
        `Unable to connect to ${targetUrl}. ` +
        `This is usually caused by browser CORS policy or an unreachable server. ` +
        `Ensure your model server is running and configured to allow cross-origin requests ` +
        `(e.g., for Ollama set OLLAMA_ORIGINS="*", for llama-server add --cors, or enable CORS in LM Studio settings).`
      );
    }
    return err.message;
  }
  return String(err);
}

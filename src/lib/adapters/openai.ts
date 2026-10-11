import type { DiagnosticResult, Message, ModelProfile } from '../../types';
import { SSEParser } from '../streaming/sse-parser';
import { constructEndpointRoutes, normalizeBaseUrl } from './endpoint';

export { normalizeBaseUrl, constructEndpointRoutes };

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
 * Construct safe authorization and request headers.
 * Includes 'ngrok-skip-browser-warning' to prevent ngrok from serving an HTML splash page.
 */
export function getRequestHeaders(apiKey?: string): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'ngrok-skip-browser-warning': 'true',
  };
  if (apiKey && apiKey.trim().length > 0) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
  }
  return headers;
}

/**
 * Fetch available model IDs from standard GET /v1/models endpoint.
 */
export async function fetchRemoteModels(
  baseUrl: string,
  apiKey?: string,
  signal?: AbortSignal
): Promise<{ success: boolean; models: string[]; error?: string; status?: number }> {
  const routes = constructEndpointRoutes(baseUrl);
  const targetUrl = routes.discoveryUrl;

  if (routes.isMixedContentRisk) {
    return {
      success: false,
      models: [],
      error:
        `Mixed Content Blocked: Bamboo is running on HTTPS, but ${targetUrl} uses unencrypted HTTP on a remote host. ` +
        `Web browsers block HTTP calls from HTTPS sites. Use an HTTPS endpoint (e.g. ngrok/Cloudflare tunnel or SSL) or test on localhost.`,
    };
  }

  try {
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: getRequestHeaders(apiKey),
      signal,
    });

    const contentType = res.headers.get('content-type') || '';

    // Check if the server returned HTML instead of JSON (common with expired ngrok tunnels or 404 splash pages)
    if (contentType.includes('text/html')) {
      return {
        success: false,
        models: [],
        status: res.status,
        error:
          `Server returned an HTML webpage instead of JSON (HTTP ${res.status}). ` +
          `If using ngrok, the tunnel may have expired or requires a login page. Verify the tunnel is active.`,
      };
    }

    if (!res.ok) {
      if (res.status === 401) {
        return {
          success: false,
          models: [],
          status: 401,
          error: 'Authentication failed (401 Unauthorized). Verify your API key if required.',
        };
      }
      if (res.status === 404) {
        return {
          success: false,
          models: [],
          status: 404,
          error:
            `Discovery route ${targetUrl} returned 404 Not Found. ` +
            `Some servers (like standard llama-server) do not expose /models. You can enter the Model ID manually and test chat completions directly.`,
        };
      }
      return {
        success: false,
        models: [],
        status: res.status,
        error: `Server returned HTTP ${res.status}: ${res.statusText}`,
      };
    }

    const data = await res.json();
    let modelList: string[] = [];

    if (Array.isArray(data?.data)) {
      modelList = data.data.map((m: OpenAIModelItem) => m.id).filter(Boolean);
    } else if (Array.isArray(data?.models)) {
      modelList = data.models.map((m: { name?: string; id?: string }) => m.name || m.id || '').filter(Boolean);
    } else if (Array.isArray(data)) {
      modelList = data.map((m: OpenAIModelItem | string) => (typeof m === 'string' ? m : m.id)).filter(Boolean);
    }

    return {
      success: true,
      models: modelList.sort(),
      status: res.status,
    };
  } catch (err: unknown) {
    const msg = getFriendlyErrorMessage(err, targetUrl, routes);
    return { success: false, models: [], error: msg };
  }
}

/**
 * Diagnostic action 1: Test Model Discovery (GET /v1/models)
 */
export async function testDiscoveryEndpoint(
  baseUrl: string,
  apiKey?: string,
  signal?: AbortSignal
): Promise<DiagnosticResult> {
  const routes = constructEndpointRoutes(baseUrl);
  const startTime = Date.now();

  const result = await fetchRemoteModels(baseUrl, apiKey, signal);
  const elapsedMs = Date.now() - startTime;

  if (result.success) {
    return {
      type: 'discovery',
      success: true,
      effectiveUrl: routes.discoveryUrl,
      httpStatus: result.status || 200,
      elapsedMs,
      discoveredModels: result.models,
      message: `Successfully connected to discovery endpoint in ${elapsedMs}ms. Found ${result.models.length} model(s).`,
      nextStep: 'Select a discovered model from the dropdown or test chat completions below.',
    };
  }

  return {
    type: 'discovery',
    success: false,
    effectiveUrl: routes.discoveryUrl,
    httpStatus: result.status,
    elapsedMs,
    message: result.error || 'Discovery request failed.',
    nextStep:
      result.status === 404
        ? 'Discovery (/models) is optional. Enter your backend Model ID manually and click "Test Chat" to verify inference.'
        : 'Verify the server is running, CORS is enabled, and ngrok tunnel is active.',
  };
}

/**
 * Diagnostic action 2: Test Chat Completion (POST /v1/chat/completions)
 * Sends a minimal non-streaming prompt to verify real model inference.
 * Does NOT save to conversations or chat history.
 */
export async function testChatEndpoint(
  baseUrl: string,
  modelId: string,
  apiKey?: string,
  signal?: AbortSignal
): Promise<DiagnosticResult> {
  const routes = constructEndpointRoutes(baseUrl);
  const targetUrl = routes.chatUrl;
  const startTime = Date.now();

  if (!modelId.trim()) {
    return {
      type: 'chat',
      success: false,
      effectiveUrl: targetUrl,
      elapsedMs: 0,
      message: 'A Model ID is required to test chat inference.',
      nextStep: 'Enter the backend model identifier (e.g., llama3.2, mistral, gpt-4o).',
    };
  }

  if (routes.isMixedContentRisk) {
    return {
      type: 'chat',
      success: false,
      effectiveUrl: targetUrl,
      elapsedMs: 0,
      message:
        `Mixed Content Blocked: Bamboo is running on HTTPS, but ${targetUrl} uses unencrypted HTTP on a remote host. ` +
        `Use HTTPS (e.g. ngrok/Cloudflare tunnel or SSL) or test on localhost.`,
    };
  }

  try {
    const payload = {
      model: modelId.trim(),
      messages: [{ role: 'user', content: 'Ping. Respond with "Pong".' }],
      max_tokens: 8,
      stream: false,
    };

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: getRequestHeaders(apiKey),
      body: JSON.stringify(payload),
      signal,
    });

    const elapsedMs = Date.now() - startTime;
    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('text/html')) {
      return {
        type: 'chat',
        success: false,
        effectiveUrl: targetUrl,
        httpStatus: res.status,
        elapsedMs,
        message:
          `Server returned HTML instead of JSON (HTTP ${res.status}). ` +
          `If using ngrok, the tunnel may have expired or requires browser authentication.`,
      };
    }

    if (!res.ok) {
      let errText = '';
      try {
        const errJson = await res.json();
        errText = errJson?.error?.message || JSON.stringify(errJson);
      } catch {
        errText = await res.text();
      }

      return {
        type: 'chat',
        success: false,
        effectiveUrl: targetUrl,
        httpStatus: res.status,
        elapsedMs,
        message: `HTTP ${res.status}: ${res.statusText}`,
        details: errText ? `Server response: ${errText}` : undefined,
        nextStep:
          res.status === 404
            ? `Endpoint or model "${modelId}" not found. Verify the model ID exists in your backend.`
            : res.status === 401
            ? 'Verify your API key in the profile settings.'
            : 'Check backend model server logs.',
      };
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || JSON.stringify(data);

    return {
      type: 'chat',
      success: true,
      effectiveUrl: targetUrl,
      httpStatus: res.status,
      elapsedMs,
      responseSnippet: content.slice(0, 100),
      message: `Inference verified successfully in ${elapsedMs}ms! Model responded: "${content.trim()}"`,
      nextStep: 'Chat completion is fully working. You can now save this profile and start chatting.',
    };
  } catch (err: unknown) {
    const elapsedMs = Date.now() - startTime;
    const msg = getFriendlyErrorMessage(err, targetUrl, routes);
    return {
      type: 'chat',
      success: false,
      effectiveUrl: targetUrl,
      elapsedMs,
      message: msg,
      nextStep: 'Ensure your server is running, the route accepts POST requests, and CORS allows this browser origin.',
    };
  }
}

/**
 * Diagnostic action 3: Test Streaming Completion (stream: true)
 */
export async function testStreamingEndpoint(
  baseUrl: string,
  modelId: string,
  apiKey?: string,
  signal?: AbortSignal
): Promise<DiagnosticResult> {
  const routes = constructEndpointRoutes(baseUrl);
  const targetUrl = routes.chatUrl;
  const startTime = Date.now();

  if (!modelId.trim()) {
    return {
      type: 'streaming',
      success: false,
      effectiveUrl: targetUrl,
      elapsedMs: 0,
      message: 'A Model ID is required to test streaming inference.',
    };
  }

  try {
    const payload = {
      model: modelId.trim(),
      messages: [{ role: 'user', content: 'Say hello in 3 words.' }],
      max_tokens: 10,
      stream: true,
    };

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: getRequestHeaders(apiKey),
      body: JSON.stringify(payload),
      signal,
    });

    if (!res.ok) {
      const elapsedMs = Date.now() - startTime;
      return {
        type: 'streaming',
        success: false,
        effectiveUrl: targetUrl,
        httpStatus: res.status,
        elapsedMs,
        message: `HTTP ${res.status}: ${res.statusText}`,
      };
    }

    if (!res.body) {
      return {
        type: 'streaming',
        success: false,
        effectiveUrl: targetUrl,
        elapsedMs: Date.now() - startTime,
        message: 'Response body is empty.',
      };
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    const parser = new SSEParser();
    let firstTokenMs: number | null = null;
    let tokensReceived = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const events = parser.feed(text);

        for (const ev of events) {
          if (ev.data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(ev.data);
            const delta = parsed?.choices?.[0]?.delta?.content;
            if (delta) {
              if (firstTokenMs === null) {
                firstTokenMs = Date.now() - startTime;
              }
              tokensReceived++;
            }
          } catch {
            // Ignore parse heartbeat
          }
        }

        // Cancel after receiving first few tokens to save inference compute
        if (tokensReceived >= 2) {
          await reader.cancel();
          break;
        }
      }
    } finally {
      reader.releaseLock();
    }

    const elapsedMs = Date.now() - startTime;
    return {
      type: 'streaming',
      success: true,
      effectiveUrl: targetUrl,
      httpStatus: res.status,
      elapsedMs,
      message: `Streaming verified in ${elapsedMs}ms (Time to first token: ${firstTokenMs ?? elapsedMs}ms). Incremental chunks received cleanly.`,
    };
  } catch (err: unknown) {
    const elapsedMs = Date.now() - startTime;
    const msg = getFriendlyErrorMessage(err, targetUrl, routes);
    return {
      type: 'streaming',
      success: false,
      effectiveUrl: targetUrl,
      elapsedMs,
      message: msg,
    };
  }
}

/**
 * Filter and build payload messages respecting context boundary and system prompts.
 */
export function buildChatMessages(
  messages: Message[],
  systemPrompt?: string,
  maxContextMessages?: number
): ChatCompletionPayloadMessage[] {
  let startIndex = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].isContextBoundary) {
      startIndex = i;
      break;
    }
  }

  let activeMessages = messages.slice(startIndex);

  if (maxContextMessages && maxContextMessages > 0 && activeMessages.length > maxContextMessages) {
    activeMessages = activeMessages.slice(activeMessages.length - maxContextMessages);
  }

  const payload: ChatCompletionPayloadMessage[] = [];

  if (systemPrompt && systemPrompt.trim()) {
    payload.push({
      role: 'system',
      content: systemPrompt.trim(),
    });
  }

  for (const m of activeMessages) {
    if (!m.content && (!m.attachments || m.attachments.length === 0)) continue;
    if (m.role !== 'user' && m.role !== 'assistant' && m.role !== 'system') continue;

    let content = m.content;
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
 * Execute streaming OpenAI-compatible chat completion request.
 */
export async function streamChatCompletion(
  profile: ModelProfile,
  payloadMessages: ChatCompletionPayloadMessage[],
  callbacks: CompletionCallbacks,
  signal: AbortSignal,
  systemPromptOverride?: string
): Promise<void> {
  const routes = constructEndpointRoutes(profile.baseUrl, profile.customChatPath);
  const targetUrl = routes.chatUrl;

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
    if (signal.aborted) return;
    const msg = getFriendlyErrorMessage(err, targetUrl, routes);
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
      friendly = `Model "${profile.modelId}" or route was not found (404) at ${targetUrl}. Verify the model ID on your server.`;
    } else if (response.status === 429) {
      friendly = 'Rate limit or resource quota exceeded (429).';
    }

    if (errorDetail) {
      friendly += `: ${errorDetail}`;
    }

    callbacks.onError(new Error(friendly));
    return;
  }

  // Non-streaming fallback
  const contentType = response.headers.get('content-type') || '';
  if (!profile.streaming || !contentType.includes('text/event-stream')) {
    try {
      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content || '';
      callbacks.onChunk(content);
      callbacks.onComplete(content);
      return;
    } catch (err: unknown) {
      callbacks.onError(
        new Error(`Failed to parse non-streaming response: ${err instanceof Error ? err.message : String(err)}`)
      );
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
      if (signal.aborted) break;

      const { done, value } = await reader.read();
      if (done) break;

      const chunkText = decoder.decode(value, { stream: true });
      const events = sseParser.feed(chunkText);

      for (const event of events) {
        if (event.data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(event.data);
          if (parsed.error) {
            throw new Error(parsed.error.message || JSON.stringify(parsed.error));
          }

          const delta = parsed?.choices?.[0]?.delta?.content;
          if (typeof delta === 'string' && delta.length > 0) {
            accumulated += delta;
            callbacks.onChunk(accumulated);
          }
        } catch (parseErr: unknown) {
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

function getFriendlyErrorMessage(
  err: unknown,
  targetUrl: string,
  routes: ReturnType<typeof constructEndpointRoutes>
): string {
  if (err instanceof Error) {
    if (err.name === 'AbortError') {
      return 'Request was aborted.';
    }

    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      if (routes.isMixedContentRisk) {
        return (
          `Mixed Content Error: Unable to fetch ${targetUrl}. The app is loaded over HTTPS, but the endpoint is unencrypted HTTP on a remote server. ` +
          `Browsers block this request. Please provide an HTTPS endpoint (e.g. ngrok tunnel) or run against localhost.`
        );
      }

      if (routes.isNgrok) {
        return (
          `Unable to connect to ngrok tunnel at ${targetUrl}. ` +
          `Verify that both your ngrok tunnel and the backend model server are actively running. ` +
          `Free ngrok tunnels may expire or change URL after restarting.`
        );
      }

      return (
        `Unable to reach ${targetUrl}. ` +
        `This can happen if the server is offline or if browser CORS restrictions block the origin. ` +
        `Ensure your model server is running and configured with CORS allowed ` +
        `(e.g., for Ollama set OLLAMA_ORIGINS="*", for llama-server add --cors, or enable CORS in LM Studio).`
      );
    }

    return err.message;
  }
  return String(err);
}

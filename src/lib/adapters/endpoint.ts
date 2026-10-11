export interface EndpointRoutes {
  baseUrl: string;
  discoveryUrl: string;
  chatUrl: string;
  isRemoteHttp: boolean;
  isNgrok: boolean;
  isLocalhost: boolean;
  isMixedContentRisk: boolean;
}

/**
 * Normalizes user-entered API base URL.
 * Handles:
 * - Accidental inclusions of '/chat/completions' or '/models'
 * - Trailing slashes
 * - Missing protocol ('http://' for localhost, 'https://' for others)
 * - Missing '/v1' path segment
 * - Accidental duplicate '/v1/v1' segments
 */
export function normalizeBaseUrl(rawUrl: string): string {
  let url = (rawUrl || '').trim();
  if (!url) return '';

  // Remove trailing slashes
  while (url.endsWith('/')) {
    url = url.slice(0, -1);
  }

  // Prepend protocol if missing
  if (!/^https?:\/\//i.test(url)) {
    if (url.startsWith('localhost') || url.startsWith('127.0.0.1')) {
      url = 'http://' + url;
    } else {
      url = 'https://' + url;
    }
  }

  // Clean up duplicate /v1 segments: e.g. /v1/v1 -> /v1
  url = url.replace(/(\/v1)+/gi, '/v1');

  // Strip terminal '/chat/completions' or '/models' if pasted directly into base URL
  if (url.toLowerCase().endsWith('/chat/completions')) {
    url = url.slice(0, -'/chat/completions'.length);
  } else if (url.toLowerCase().endsWith('/models')) {
    url = url.slice(0, -'/models'.length);
  } else if (url.toLowerCase().endsWith('/completions')) {
    url = url.slice(0, -'/completions'.length);
  }

  // Remove trailing slashes again after stripping route
  while (url.endsWith('/')) {
    url = url.slice(0, -1);
  }

  // Ensure /v1 is present at the end of the base API path
  if (!/\/v1$/i.test(url) && !/\/v1\//i.test(url)) {
    url = `${url}/v1`;
  }

  return url;
}

/**
 * Constructs explicit and verified endpoint routes for discovery and chat completion.
 */
export function constructEndpointRoutes(rawUrl: string, customChatPath?: string): EndpointRoutes {
  const baseUrl = normalizeBaseUrl(rawUrl);

  const discoveryUrl = baseUrl ? `${baseUrl}/models` : '';

  let chatUrl = '';
  if (baseUrl) {
    if (customChatPath && customChatPath.trim()) {
      const cleanPath = customChatPath.trim().startsWith('/')
        ? customChatPath.trim()
        : `/${customChatPath.trim()}`;
      chatUrl = `${baseUrl}${cleanPath}`;
    } else {
      chatUrl = `${baseUrl}/chat/completions`;
    }
  }

  let isLocalhost = false;
  let isNgrok = false;
  let isRemoteHttp = false;
  let isMixedContentRisk = false;

  try {
    if (baseUrl) {
      const parsed = new URL(baseUrl);
      isLocalhost =
        parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1' ||
        parsed.hostname === '::1';

      isNgrok = parsed.hostname.includes('ngrok');

      isRemoteHttp = parsed.protocol === 'http:' && !isLocalhost;

      // Check mixed content risk if running in browser under HTTPS
      if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
        isMixedContentRisk = isRemoteHttp;
      }
    }
  } catch {
    // URL parsing fallback
  }

  return {
    baseUrl,
    discoveryUrl,
    chatUrl,
    isRemoteHttp,
    isNgrok,
    isLocalhost,
    isMixedContentRisk,
  };
}

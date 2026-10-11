<div align="center">
  <pre align="center" style="color: #8d9d4f;">
   ▄▄                            ▄▄                           
   ██                            ██                           
   ██▄███▄    ▄█████▄  ████▄██▄  ██▄███▄    ▄████▄    ▄████▄  
   ██▀  ▀██   ▀ ▄▄▄██  ██ ██ ██  ██▀  ▀██  ██▀  ▀██  ██▀  ▀██ 
   ██    ██  ▄██▀▀▀██  ██ ██ ██  ██    ██  ██    ██  ██    ██ 
  ███▄▄██▀  ██▄▄▄███  ██ ██ ██  ███▄▄██▀  ▀██▄▄██▀  ▀██▄▄██▀
▀▀ ▀▀▀     ▀▀▀▀ ▀▀  ▀▀ ▀▀ ▀▀  ▀▀ ▀▀▀      ▀▀▀▀      ▀▀▀▀
  </pre>
</div>

> A polished, private, local-first AI chat workspace inspired by Claude and OpenWebUI.

bamboo is a lightweight, high-performance Progressive Web App. It runs entirely in your browser with local persistence in IndexedDB and connects directly to your own OpenAI-compatible model endpoints (Ollama, LM Studio, llama-server, vLLM, or remote compatible inference APIs).

---

## Key Features

- **Local-First & Private:** No cloud accounts, databases, trackers, or telemetry. All conversations, model profiles, and settings reside directly in your browser's IndexedDB.
- **Empty & Honest Initial State:** No fake models, preloaded chats, or fabricated latency numbers. You connect your real models.
- **Strict Role Alignment:**
  - Assistant responses: **Left-aligned**, flowing naturally in the readable container.
  - User messages: **Right-aligned**, with distinct secondary background and editing capabilities.
- **Full Markdown, LaTeX, and Code Support:**
  - Mathematical typesetting via **KaTeX** (`$...$`, `\(...\)`, `$$...$$`, `\[...\]`).
  - Code blocks with syntax highlighting via **Prism.js**, one-click copy, file download with language extension, and expand/collapse for long snippets.
  - Sanitized rendering with **DOMPurify** preventing XSS.
- **Robust SSE Streaming Engine:**
  - Real-time incremental Server-Sent Events parser handling split chunks, `[DONE]`, network drops, and immediate cancellation via `AbortController`.
  - Generation state machine: `ready`, `connecting`, `generating`, `stopping`, `complete`, `interrupted`, and `error`.
- **Conversation Management:**
  - Search with debouncing, pin, archive/restore, and delete.
  - **Context Boundary:** Clear inference context while preserving visible conversation history.
  - Edit user messages with automatic downstream branch invalidation.
  - Export conversations to Markdown files.
- **Full PWA Support:**
  - Standalone display mode, web app manifest, custom bamboo SVG and PNG icon assets.
  - Service worker caching the app shell while strictly bypassing model API routes.
  - In-app install banner with iOS Safari guided flow.
- **Backup & Restore:**
  - Versioned JSON export with explicit warning for optional API keys.
  - Merge or replace import options with validation.

---

## Design System

Bamboo uses a calm palette:
- Muted sage and olive primary actions (`oklch(0.666 0.105 118.908)` in light, `oklch(0.676 0.057 132.448)` in dark).
- Warm cream, muted brown, and charcoal surfaces.
- Strictly no fluorescent or neon yellow accents.
- Light, Dark, and System theme persistence.

---

## Quickstart (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Run automated tests (Vitest)
npm test

# 4. Check TypeScript types
npm run lint

# 5. Build for production
npm run build
```

---

## Configuring Your First Model Endpoint

Bamboo connects to any OpenAI-compatible `/v1` endpoint.

### 1. Ollama
Run Ollama with CORS allowed:
```bash
OLLAMA_ORIGINS="*" ollama serve
```
In Bamboo:
- **Display Name:** `Ollama Llama 3`
- **Base URL:** `http://localhost:11434/v1`
- Click **Fetch models from server** and select your downloaded model (e.g., `llama3.2`).

### 2. LM Studio
1. Open the **Local Server** tab in LM Studio.
2. Check **Enable CORS**.
3. Start the server (default port `1234`).
4. In Bamboo:
   - **Display Name:** `LM Studio Local`
   - **Base URL:** `http://localhost:1234/v1`
   - Select your loaded model ID.

### 3. llama.cpp / llama-server
```bash
./llama-server --cors -m /path/to/model.gguf --port 8080
```
In Bamboo:
- **Base URL:** `http://localhost:8080/v1`

---

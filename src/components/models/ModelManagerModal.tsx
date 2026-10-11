import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Edit2,
  HelpCircle,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { ModelProfile } from '../../types';
import {
  fetchRemoteModels,
  normalizeBaseUrl,
  testEndpointConnection,
} from '../../lib/adapters/openai';
import { Dialog } from '../ui/Dialog';

interface ModelManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  models: ModelProfile[];
  activeModelId: string | null;
  onSelectModel: (id: string) => void;
  onCreateModel: (model: Omit<ModelProfile, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ModelProfile>;
  onUpdateModel: (id: string, updates: Partial<ModelProfile>) => Promise<void>;
  onDuplicateModel: (id: string) => Promise<ModelProfile>;
  onRemoveModel: (id: string) => Promise<void>;
  onSetDefaultModel: (id: string) => Promise<void>;
}

export const ModelManagerModal: React.FC<ModelManagerModalProps> = ({
  isOpen,
  onClose,
  models,
  activeModelId,
  onSelectModel,
  onCreateModel,
  onUpdateModel,
  onDuplicateModel,
  onRemoveModel,
  onSetDefaultModel,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('http://localhost:11434/v1');
  const [modelId, setModelId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(0.9);
  const [maxTokens, setMaxTokens] = useState<number | undefined>(undefined);
  const [streaming, setStreaming] = useState(true);
  const [isDefault, setIsDefault] = useState(false);

  // Diagnostic states
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [showCorsHelp, setShowCorsHelp] = useState(false);

  const resetForm = () => {
    setName('');
    setBaseUrl('http://localhost:11434/v1');
    setModelId('');
    setApiKey('');
    setDescription('');
    setSystemPrompt('');
    setTemperature(0.7);
    setTopP(0.9);
    setMaxTokens(undefined);
    setStreaming(true);
    setIsDefault(models.length === 0);
    setTestResult(null);
    setFetchedModels([]);
    setFetchError(null);
    setEditingId(null);
    setIsAddingNew(false);
  };

  const handleStartAdd = () => {
    resetForm();
    setIsAddingNew(true);
  };

  const handleStartEdit = (m: ModelProfile) => {
    setEditingId(m.id);
    setName(m.name);
    setBaseUrl(m.baseUrl);
    setModelId(m.modelId);
    setApiKey(m.apiKey || '');
    setDescription(m.description || '');
    setSystemPrompt(m.systemPrompt || '');
    setTemperature(m.temperature ?? 0.7);
    setTopP(m.topP ?? 0.9);
    setMaxTokens(m.maxTokens);
    setStreaming(m.streaming !== false);
    setIsDefault(!!m.isDefault);
    setTestResult(null);
    setFetchedModels([]);
    setFetchError(null);
    setIsAddingNew(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !baseUrl.trim() || !modelId.trim()) return;

    const normalizedUrl = normalizeBaseUrl(baseUrl);

    const payload = {
      name: name.trim(),
      baseUrl: normalizedUrl,
      modelId: modelId.trim(),
      apiKey: apiKey.trim() ? apiKey.trim() : undefined,
      description: description.trim() || undefined,
      systemPrompt: systemPrompt.trim() || undefined,
      temperature,
      topP,
      maxTokens: maxTokens && maxTokens > 0 ? maxTokens : undefined,
      streaming,
      isDefault,
    };

    if (editingId) {
      await onUpdateModel(editingId, payload);
    } else {
      await onCreateModel(payload);
    }

    resetForm();
  };

  const handleTestConnection = async () => {
    if (!baseUrl.trim()) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testEndpointConnection(baseUrl, apiKey.trim() || undefined);
      setTestResult(result);
    } finally {
      setIsTesting(false);
    }
  };

  const handleFetchModels = async () => {
    if (!baseUrl.trim()) return;
    setIsFetchingModels(true);
    setFetchError(null);
    try {
      const res = await fetchRemoteModels(baseUrl, apiKey.trim() || undefined);
      if (res.success) {
        setFetchedModels(res.models);
        if (res.models.length > 0 && !modelId) {
          setModelId(res.models[0]);
        }
      } else {
        setFetchError(res.error || 'Failed to fetch models list.');
      }
    } finally {
      setIsFetchingModels(false);
    }
  };

  const isFormActive = isAddingNew || editingId !== null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Model Profiles"
      description="Connect OpenAI-compatible model backends (Ollama, LM Studio, llama.cpp, vLLM)."
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        {/* If not in add/edit mode, show list of models */}
        {!isFormActive ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-muted-foreground">
                {models.length} configured profile{models.length !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={handleStartAdd}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add model</span>
              </button>
            </div>

            {models.length === 0 ? (
              <div className="text-center py-10 px-4 rounded-lg border border-dashed border-border bg-muted/20">
                <Sparkles className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
                <h3 className="text-sm font-medium text-foreground">No model profiles configured</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                  Bamboo does not preload models. Connect your local or remote OpenAI-compatible endpoint to begin.
                </p>
                <button
                  type="button"
                  onClick={handleStartAdd}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Configure your first model</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {models.map((m) => {
                  const isActive = activeModelId === m.id;
                  return (
                    <div
                      key={m.id}
                      className={`p-3 rounded-lg border transition-colors flex items-center justify-between gap-3 ${
                        isActive
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-border bg-card hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-foreground truncate">
                            {m.name}
                          </span>
                          {m.isDefault && (
                            <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-semibold">
                              Default
                            </span>
                          )}
                          {isActive && (
                            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                              (Active)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono truncate mt-0.5">
                          {m.modelId} · {m.baseUrl}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {!isActive && (
                          <button
                            type="button"
                            onClick={() => onSelectModel(m.id)}
                            className="px-2 py-1 text-xs rounded hover:bg-muted text-foreground transition-colors cursor-pointer"
                            title="Set as active chat model"
                          >
                            Select
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(m)}
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          title="Edit profile"
                          aria-label="Edit model profile"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDuplicateModel(m.id)}
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          title="Duplicate profile"
                          aria-label="Duplicate model profile"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveModel(m.id)}
                          className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                          title="Delete profile"
                          aria-label="Delete model profile"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Add / Edit Form */
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">
                {editingId ? 'Edit Model Profile' : 'Add Model Profile'}
              </h3>
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Back to list
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Display Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ollama Llama 3"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-border bg-input/20 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  API Base URL <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="http://localhost:11434/v1"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-border bg-input/20 text-foreground placeholder:text-muted-foreground font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            {/* Model ID & Fetch Remote Models */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-foreground">
                  Backend Model ID <span className="text-destructive">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleFetchModels}
                  disabled={isFetchingModels || !baseUrl.trim()}
                  className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline transition cursor-pointer disabled:opacity-50"
                >
                  {isFetchingModels ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  <span>Fetch models from server</span>
                </button>
              </div>

              {fetchedModels.length > 0 ? (
                <div className="space-y-1">
                  <select
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-border bg-card text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Select a discovered model...</option>
                    {fetchedModels.map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-muted-foreground">
                    Or type manually below if you prefer.
                  </p>
                </div>
              ) : null}

              <input
                type="text"
                required
                placeholder="e.g. llama3.2, mistral:7b, gpt-4o"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="w-full mt-1 px-3 py-1.5 text-xs rounded-md border border-border bg-input/20 text-foreground placeholder:text-muted-foreground font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              />

              {fetchError && (
                <p className="text-[11px] text-destructive mt-1 flex items-start gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{fetchError}</span>
                </p>
              )}
            </div>

            {/* Optional API Key */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                API Key <span className="text-muted-foreground">(Optional for local models)</span>
              </label>
              <input
                type="password"
                placeholder="Leave blank for local Ollama / LM Studio"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-md border border-border bg-input/20 text-foreground placeholder:text-muted-foreground font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* System Prompt */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                System Prompt <span className="text-muted-foreground">(Optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="e.g. You are a helpful, thoughtful software engineering partner."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-md border border-border bg-input/20 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>

            {/* Inference Parameters */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-foreground mb-1">
                  Temperature: {temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-foreground mb-1">
                  Top-P: {topP}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={topP}
                  onChange={(e) => setTopP(parseFloat(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-foreground mb-1">
                  Max Tokens
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 4096"
                  value={maxTokens ?? ''}
                  onChange={(e) =>
                    setMaxTokens(e.target.value ? parseInt(e.target.value, 10) : undefined)
                  }
                  className="w-full px-2 py-1 text-xs rounded border border-border bg-input/20 text-foreground"
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={streaming}
                  onChange={(e) => setStreaming(e.target.checked)}
                  className="accent-primary rounded"
                />
                <span>Enable response streaming (SSE)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="accent-primary rounded"
                />
                <span>Set as default model profile</span>
              </label>
            </div>

            {/* Test Connection Diagnostic */}
            <div className="pt-2 border-t border-border flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting || !baseUrl.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Test Connection</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCorsHelp(!showCorsHelp)}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition cursor-pointer"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>CORS & Endpoint Guide</span>
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-2.5 rounded-md text-xs flex items-start gap-2 ${
                    testResult.success
                      ? 'bg-primary/10 border border-primary/30 text-foreground'
                      : 'bg-destructive/10 border border-destructive/30 text-destructive'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  )}
                  <span className="leading-relaxed">{testResult.message}</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-muted text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
              >
                {editingId ? 'Save Changes' : 'Create Profile'}
              </button>
            </div>
          </form>
        )}

        {/* CORS & Local Endpoints Guidance */}
        {(showCorsHelp || models.length === 0) && (
          <div className="p-3 rounded-lg border border-border bg-muted/30 text-xs space-y-2">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-primary" />
              <span>Connecting Local Models & Browser CORS</span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Because Bamboo runs in your browser, your local model server must allow browser cross-origin requests (CORS):
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] pt-1">
              <div className="p-2 rounded bg-card border border-border/50">
                <span className="font-semibold text-foreground block mb-0.5">Ollama:</span>
                <code className="text-muted-foreground font-mono">OLLAMA_ORIGINS="*" ollama serve</code>
              </div>
              <div className="p-2 rounded bg-card border border-border/50">
                <span className="font-semibold text-foreground block mb-0.5">llama-server:</span>
                <code className="text-muted-foreground font-mono">./llama-server --cors -m model.gguf</code>
              </div>
              <div className="p-2 rounded bg-card border border-border/50">
                <span className="font-semibold text-foreground block mb-0.5">LM Studio:</span>
                <span className="text-muted-foreground">Enable "Cross-Origin-Resource-Sharing (CORS)" in Local Server tab.</span>
              </div>
              <div className="p-2 rounded bg-card border border-border/50">
                <span className="font-semibold text-foreground block mb-0.5">vLLM:</span>
                <code className="text-muted-foreground font-mono">vllm serve ... --allowed-origins "*"</code>
              </div>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};

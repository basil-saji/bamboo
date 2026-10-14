import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Cpu,
  Edit2,
  ExternalLink,
  HelpCircle,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Terminal,
  Trash2,
  Zap,
} from 'lucide-react';
import type { DiagnosticResult, ModelProfile } from '../../types';
import {
  constructEndpointRoutes,
  fetchRemoteModels,
  normalizeBaseUrl,
  testChatEndpoint,
  testDiscoveryEndpoint,
  testStreamingEndpoint,
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
  const [customChatPath, setCustomChatPath] = useState('');
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
  const [diagnosticLoading, setDiagnosticLoading] = useState<'discovery' | 'chat' | 'streaming' | null>(null);
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);

  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [showAdvancedRoutes, setShowAdvancedRoutes] = useState(false);
  const [showEndpointHelp, setShowEndpointHelp] = useState(false);

  const routes = constructEndpointRoutes(baseUrl, customChatPath);

  const resetForm = () => {
    setName('');
    setBaseUrl('http://localhost:11434/v1');
    setCustomChatPath('');
    setModelId('');
    setApiKey('');
    setDescription('');
    setSystemPrompt('');
    setTemperature(0.7);
    setTopP(0.9);
    setMaxTokens(undefined);
    setStreaming(true);
    setIsDefault(models.length === 0);
    setDiagnosticResult(null);
    setFetchedModels([]);
    setFetchError(null);
    setEditingId(null);
    setIsAddingNew(false);
    setShowAdvancedRoutes(false);
  };

  const handleStartAdd = () => {
    resetForm();
    setIsAddingNew(true);
  };

  const handleStartEdit = (m: ModelProfile) => {
    setEditingId(m.id);
    setName(m.name);
    setBaseUrl(m.baseUrl);
    setCustomChatPath(m.customChatPath || '');
    setModelId(m.modelId);
    setApiKey(m.apiKey || '');
    setDescription(m.description || '');
    setSystemPrompt(m.systemPrompt || '');
    setTemperature(m.temperature ?? 0.7);
    setTopP(m.topP ?? 0.9);
    setMaxTokens(m.maxTokens);
    setStreaming(m.streaming !== false);
    setIsDefault(!!m.isDefault);
    setDiagnosticResult(null);
    setFetchedModels([]);
    setFetchError(null);
    setIsAddingNew(false);
    setShowAdvancedRoutes(!!m.customChatPath);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !baseUrl.trim() || !modelId.trim()) return;

    const normalizedUrl = normalizeBaseUrl(baseUrl);

    const payload = {
      name: name.trim(),
      baseUrl: normalizedUrl,
      customChatPath: customChatPath.trim() || undefined,
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

  // Test Discovery Action
  const handleTestDiscovery = async () => {
    if (!baseUrl.trim()) return;
    setDiagnosticLoading('discovery');
    setDiagnosticResult(null);
    try {
      const res = await testDiscoveryEndpoint(baseUrl, apiKey.trim() || undefined);
      setDiagnosticResult(res);
      if (res.discoveredModels && res.discoveredModels.length > 0) {
        setFetchedModels(res.discoveredModels);
        if (!modelId) {
          setModelId(res.discoveredModels[0]);
        }
      }
    } finally {
      setDiagnosticLoading(null);
    }
  };

  // Test Chat Action (Real minimal inference test)
  const handleTestChat = async () => {
    if (!baseUrl.trim() || !modelId.trim()) return;
    setDiagnosticLoading('chat');
    setDiagnosticResult(null);
    try {
      const res = await testChatEndpoint(baseUrl, modelId, apiKey.trim() || undefined);
      setDiagnosticResult(res);
    } finally {
      setDiagnosticLoading(null);
    }
  };

  // Test Streaming Action
  const handleTestStreaming = async () => {
    if (!baseUrl.trim() || !modelId.trim()) return;
    setDiagnosticLoading('streaming');
    setDiagnosticResult(null);
    try {
      const res = await testStreamingEndpoint(baseUrl, modelId, apiKey.trim() || undefined);
      setDiagnosticResult(res);
    } finally {
      setDiagnosticLoading(null);
    }
  };

  // Quick Fetch Models
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
      description="Connect and test your OpenAI-compatible inference backends."
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        {!isFormActive ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground font-sans">
                {models.length} configured profile{models.length !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={handleStartAdd}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium rounded-full bg-primary text-primary-foreground hover:opacity-90 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add model</span>
              </button>
            </div>

            {models.length === 0 ? (
              <div className="text-center py-10 px-4 rounded-xl border border-dashed border-border/15 bg-muted/20">
                <Cpu className="w-10 h-10 mx-auto text-primary mb-2 opacity-80" />
                <h3 className="text-sm font-medium text-foreground">No model profiles configured</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-4 leading-relaxed font-sans">
                  Bamboo starts completely empty. Connect your local Ollama, LM Studio, llama-server, or remote tunnel to start chatting.
                </p>
                <button
                  type="button"
                  onClick={handleStartAdd}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Configure your first model</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto">
                {models.map((m) => {
                  const isActive = activeModelId === m.id;
                  return (
                    <div
                      key={m.id}
                      className={`p-4 rounded-2xl border transition-colors flex flex-wrap items-center justify-between gap-3 ${
                        isActive
                          ? 'border-primary/50 bg-primary/5'
                          : 'border-border/15 bg-card hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex-1 min-w-[12rem]">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-base text-foreground truncate">
                            {m.name}
                          </span>
                          {m.isDefault && (
                            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                              Default
                            </span>
                          )}
                          {isActive && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-[13px] text-muted-foreground font-mono truncate mt-1">
                          {m.modelId} · {m.baseUrl}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {!isActive && (
                          <button
                            type="button"
                            onClick={() => onSelectModel(m.id)}
                            className="px-2 py-1 text-sm rounded-lg hover:bg-muted text-foreground transition cursor-pointer"
                            title="Set as active chat model"
                          >
                            Select
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(m)}
                          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                          title="Edit profile"
                          aria-label="Edit model profile"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDuplicateModel(m.id)}
                          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                          title="Duplicate profile"
                          aria-label="Duplicate model profile"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveModel(m.id)}
                          className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition cursor-pointer"
                          title="Delete profile"
                          aria-label="Delete model profile"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Profile Add/Edit Form */
          <form onSubmit={handleSave} className="space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-border/15">
              <h3 className="text-sm font-semibold text-foreground">
                {editingId ? 'Edit Model Profile' : 'Configure Model Profile'}
              </h3>
              <button
                type="button"
                onClick={resetForm}
                className="text-sm text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                Back to list
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Display Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Local Llama 3 or Remote Qwen"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-base rounded-xl border border-border/15 bg-muted/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  API Base URL <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="http://localhost:11434/v1 or https://xxxx.ngrok-free.app/v1"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-base rounded-xl border border-border/15 bg-muted/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
                />
                <p className="text-xs text-muted-foreground mt-0.5">
                  Format: <code className="font-mono">http://localhost:11434/v1</code> or <code className="font-mono">https://xxxx.ngrok-free.app/v1</code>
                </p>
              </div>
            </div>

            {/* Effective Endpoint Routes Preview & Diagnostic Box */}
            <div className="p-3 rounded-xl border border-border/15 bg-muted/25 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground text-sm">
                  Effective Route Construction
                </span>
                <button
                  type="button"
                  onClick={() => setShowAdvancedRoutes(!showAdvancedRoutes)}
                  className="text-[13px] text-primary hover:underline cursor-pointer"
                >
                  {showAdvancedRoutes ? 'Hide custom route' : 'Customize route'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[13px] font-mono">
                <div className="p-2 rounded-lg bg-card border border-border/15">
                  <span className="text-muted-foreground block text-xs">Model Discovery (GET):</span>
                  <span className="text-foreground truncate block">{routes.discoveryUrl || 'None'}</span>
                </div>
                <div className="p-2 rounded-lg bg-card border border-border/15">
                  <span className="text-muted-foreground block text-xs">Chat Completion (POST):</span>
                  <span className="text-foreground truncate block">{routes.chatUrl || 'None'}</span>
                </div>
              </div>

              {showAdvancedRoutes && (
                <div className="pt-2 border-t border-border/15">
                  <label className="block text-[13px] font-medium text-foreground mb-1.5">
                    Custom Chat Path Override <span className="text-muted-foreground">(Optional, default: /chat/completions)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="/chat/completions"
                    value={customChatPath}
                    onChange={(e) => setCustomChatPath(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-base rounded-lg border border-border/15 bg-muted/40 text-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
                  />
                </div>
              )}

              {/* Mixed Content Warning Banner */}
              {routes.isMixedContentRisk && (
                <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-[13px] flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Mixed Content Warning: You are loading Bamboo over HTTPS, but this endpoint uses remote HTTP. Browsers block remote HTTP requests from HTTPS sites. Use an HTTPS ngrok/tunnel or test against localhost.
                  </span>
                </div>
              )}
            </div>

            {/* Model ID Selection & Fetching */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-foreground">
                  Backend Model ID <span className="text-destructive">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleFetchModels}
                  disabled={isFetchingModels || !baseUrl.trim()}
                  className="inline-flex items-center gap-1 text-[13px] text-primary hover:underline cursor-pointer disabled:opacity-50"
                  title="Query GET /v1/models"
                >
                  {isFetchingModels ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  <span>Fetch models from server</span>
                </button>
              </div>

              {fetchedModels.length > 0 && (
                <select
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  className="w-full mb-1.5 px-3.5 py-2.5 text-base rounded-xl border border-border/15 bg-card text-foreground font-mono focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
                >
                  <option value="">Select discovered model...</option>
                  {fetchedModels.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              )}

              <input
                type="text"
                required
                placeholder="e.g. llama3.2, mistral:7b, gpt-4o, qwen2.5:7b"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-base rounded-xl border border-border/15 bg-muted/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
              />

              {fetchError && (
                <p className="text-[13px] text-muted-foreground mt-1 flex items-start gap-1">
                  <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>
                    Note: {fetchError} (Model discovery is optional; you can enter your model ID manually and test chat inference below).
                  </span>
                </p>
              )}
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                API Key <span className="text-muted-foreground">(Optional for local endpoints)</span>
              </label>
              <input
                type="password"
                placeholder="Leave blank for local Ollama / LM Studio"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3.5 py-2.5 text-base rounded-xl border border-border/15 bg-muted/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
              />
            </div>

            {/* System Prompt */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Profile System Prompt <span className="text-muted-foreground">(Optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="e.g. You are a helpful, thoughtful coding and research assistant."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full px-3.5 py-2.5 text-base rounded-xl border border-border/15 bg-muted/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/25 resize-none"
              />
            </div>

            {/* Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <label className="block text-[13px] font-medium text-foreground mb-1.5">
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
                <label className="block text-[13px] font-medium text-foreground mb-1.5">
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
                <label className="block text-[13px] font-medium text-foreground mb-1.5">
                  Max Output Tokens
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 4096"
                  value={maxTokens ?? ''}
                  onChange={(e) =>
                    setMaxTokens(e.target.value ? parseInt(e.target.value, 10) : undefined)
                  }
                  className="w-full px-3.5 py-2.5 text-base rounded-lg border border-border/15 bg-muted/40 text-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={streaming}
                  onChange={(e) => setStreaming(e.target.checked)}
                  className="accent-primary rounded-lg"
                />
                <span>Enable response streaming (SSE)</span>
              </label>

              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="accent-primary rounded-lg"
                />
                <span>Set as default model profile</span>
              </label>
            </div>

            {/* SEPARATE DIAGNOSTIC ACTIONS (Section 8 of prompt) */}
            <div className="pt-3 border-t border-border/15 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">
                  Connection & Inference Diagnostics
                </span>
                <button
                  type="button"
                  onClick={() => setShowEndpointHelp(!showEndpointHelp)}
                  className="inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4 text-primary" />
                  <span>Setup Guide</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestDiscovery}
                  disabled={diagnosticLoading !== null || !baseUrl.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-xl border border-border/15 bg-card hover:bg-muted text-foreground transition cursor-pointer disabled:opacity-50"
                  title="Test GET /v1/models endpoint"
                >
                  {diagnosticLoading === 'discovery' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 text-primary" />}
                  <span>Test Discovery (/models)</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestChat}
                  disabled={diagnosticLoading !== null || !baseUrl.trim() || !modelId.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-xl border border-border/15 bg-card hover:bg-muted text-foreground transition cursor-pointer disabled:opacity-50"
                  title="Sends a minimal 'Ping' prompt to verify real chat completion"
                >
                  {diagnosticLoading === 'chat' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 text-primary" />}
                  <span>Test Chat Inference</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestStreaming}
                  disabled={diagnosticLoading !== null || !baseUrl.trim() || !modelId.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-xl border border-border/15 bg-card hover:bg-muted text-foreground transition cursor-pointer disabled:opacity-50"
                  title="Tests incremental SSE streaming event delivery"
                >
                  {diagnosticLoading === 'streaming' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-primary" />}
                  <span>Test Streaming (SSE)</span>
                </button>
              </div>

              {/* Diagnostic Result Box */}
              {diagnosticResult && (
                <div
                  className={`p-3 rounded-xl text-sm space-y-1.5 ${
                    diagnosticResult.success
                      ? 'bg-primary/10 border border-primary/30 text-foreground'
                      : 'bg-destructive/10 border border-destructive/30 text-destructive'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {diagnosticResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 space-y-1 leading-relaxed">
                      <div className="font-semibold">{diagnosticResult.message}</div>
                      {diagnosticResult.details && (
                        <div className="text-[13px] opacity-90">{diagnosticResult.details}</div>
                      )}
                      <div className="text-xs opacity-75 font-mono pt-0.5">
                        Route: {diagnosticResult.effectiveUrl} · Latency: {diagnosticResult.elapsedMs}ms
                        {diagnosticResult.httpStatus ? ` · HTTP ${diagnosticResult.httpStatus}` : ''}
                      </div>
                      {diagnosticResult.nextStep && (
                        <div className="text-[13px] font-medium pt-1 text-foreground/90">
                          Next step: {diagnosticResult.nextStep}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="sticky -bottom-5 z-10 -mx-5 -mb-5 flex items-center justify-end gap-2 border-t border-border/15 bg-card px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:-bottom-7 sm:-mx-7 sm:-mb-7 sm:px-7">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2.5 text-sm font-medium rounded-xl border border-border/15 hover:bg-muted text-foreground transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-sm font-medium rounded-full bg-primary text-primary-foreground hover:opacity-90 transition cursor-pointer"
              >
                {editingId ? 'Save Changes' : 'Create Profile'}
              </button>
            </div>
          </form>
        )}

        {/* Backend & CORS Guidance */}
        {showEndpointHelp && (
          <div className="p-3.5 rounded-xl border border-border/15 bg-card text-sm space-y-2.5">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-primary" />
              <span>Backend Setup & CORS Configuration Guide</span>
            </div>
            <p className="text-muted-foreground text-[13px] leading-relaxed">
              Because Bamboo is a browser application, backend model servers must permit cross-origin requests:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[13px]">
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/15">
                <span className="font-semibold text-foreground block mb-0.5">Ollama:</span>
                <code className="text-primary font-mono text-xs block mb-1">OLLAMA_ORIGINS="*" ollama serve</code>
                <span className="text-muted-foreground text-xs">Default URL: http://localhost:11434/v1</span>
              </div>

              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/15">
                <span className="font-semibold text-foreground block mb-0.5">llama.cpp / llama-server:</span>
                <code className="text-primary font-mono text-xs block mb-1">./llama-server --cors -m model.gguf --port 8080</code>
                <span className="text-muted-foreground text-xs">Default URL: http://localhost:8080/v1</span>
              </div>

              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/15">
                <span className="font-semibold text-foreground block mb-0.5">LM Studio:</span>
                <span className="text-muted-foreground text-xs block mb-1">
                  Open Local Server tab → Check "Enable CORS"
                </span>
                <span className="text-muted-foreground text-xs">Default URL: http://localhost:1234/v1</span>
              </div>

              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/15">
                <span className="font-semibold text-foreground block mb-0.5">ngrok Remote Tunnel:</span>
                <code className="text-primary font-mono text-xs block mb-1">ngrok http 11434</code>
                <span className="text-muted-foreground text-xs">
                  Use the HTTPS tunnel URL (e.g. https://xyz.ngrok-free.app/v1). Bamboo automatically includes header to skip warning page.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};

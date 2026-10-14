import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  HardDrive,
  Laptop,
  Moon,
  Plus,
  Shield,
  Sliders,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import type { PromptPreset, ThemeMode, UserSettings } from '../../types';
import {
  exportBackup,
  importBackup,
} from '../../lib/backups/export-import';
import {
  clearAllData,
  deletePrompt,
  getAllPrompts,
  getStorageEstimate,
  savePrompt,
} from '../../lib/storage/db';
import { Dialog } from '../ui/Dialog';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  settings: UserSettings;
  onUpdateSettings: (settings: UserSettings) => Promise<void>;
  onOpenModelManager: () => void;
  onDataReset: () => void;
}

type SettingsTab = 'appearance' | 'chat' | 'prompts' | 'storage' | 'pwa';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  onThemeChange,
  settings,
  onUpdateSettings,
  onOpenModelManager,
  onDataReset,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');

  // Prompts state
  const [prompts, setPrompts] = useState<PromptPreset[]>([]);
  const [newPromptTitle, setNewPromptTitle] = useState('');
  const [newPromptContent, setNewPromptContent] = useState('');
  const [isAddingPrompt, setIsAddingPrompt] = useState(false);

  // Storage estimation
  const [storageInfo, setStorageInfo] = useState<{ usage: number; quota: number }>({ usage: 0, quota: 0 });

  // Backup state
  const [includeApiKeys, setIncludeApiKeys] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importStatus, setImportStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [isConfirmingClearAll, setIsConfirmingClearAll] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      getAllPrompts().then(setPrompts);
      getStorageEstimate().then(setStorageInfo);
      setImportStatus(null);
      setIsConfirmingClearAll(false);
    }
  }, [isOpen]);

  const handleCreatePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromptTitle.trim() || !newPromptContent.trim()) return;

    const newPrompt: PromptPreset = {
      id: crypto.randomUUID(),
      title: newPromptTitle.trim(),
      content: newPromptContent.trim(),
      createdAt: Date.now(),
    };

    await savePrompt(newPrompt);
    const updated = await getAllPrompts();
    setPrompts(updated);
    setNewPromptTitle('');
    setNewPromptContent('');
    setIsAddingPrompt(false);
  };

  const handleDeletePrompt = async (id: string) => {
    await deletePrompt(id);
    const updated = await getAllPrompts();
    setPrompts(updated);
  };

  const handleExportBackup = async () => {
    const data = await exportBackup({ includeApiKeys });
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bamboo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const result = await importBackup(parsed, importMode);
        if (result.success) {
          setImportStatus({
            success: true,
            message: `Successfully imported ${result.importedConversations} conversation(s) and ${result.importedModels} model(s).`,
          });
          onDataReset();
        } else {
          setImportStatus({
            success: false,
            message: result.error || 'Failed to import backup.',
          });
        }
      } catch (err: unknown) {
        setImportStatus({
          success: false,
          message: `Invalid JSON file: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearAllData = async () => {
    await clearAllData();
    setIsConfirmingClearAll(false);
    onDataReset();
    onClose();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Settings"
      description="Configure workspace preferences, shortcuts, and local storage."
      maxWidth="max-w-2xl"
    >
      <div className="flex flex-col md:flex-row gap-6 min-h-[380px]">
        {/* Navigation Tabs */}
        <div className="flex md:flex-col gap-1 border-b md:border-b-0 md:border-r border-border/15 pb-3 md:pb-0 md:pr-4 md:w-44 shrink-0 text-sm">
          <button
            type="button"
            onClick={() => setActiveTab('appearance')}
            className={`w-full text-left px-3 py-2 rounded-xl font-medium transition-colors cursor-pointer ${
              activeTab === 'appearance'
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Appearance
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`w-full text-left px-3 py-2 rounded-xl font-medium transition-colors cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Chat Behavior
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('prompts')}
            className={`w-full text-left px-3 py-2 rounded-xl font-medium transition-colors cursor-pointer ${
              activeTab === 'prompts'
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Prompt Presets
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('storage')}
            className={`w-full text-left px-3 py-2 rounded-xl font-medium transition-colors cursor-pointer ${
              activeTab === 'storage'
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Data & Privacy
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pwa')}
            className={`w-full text-left px-3 py-2 rounded-xl font-medium transition-colors cursor-pointer ${
              activeTab === 'pwa'
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            PWA & Offline
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto pr-1">
          {/* --- APPEARANCE --- */}
          {activeTab === 'appearance' && (
            <div className="space-y-6 text-sm">
              <div>
                <h3 className="font-semibold text-foreground text-sm mb-3">Theme</h3>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => onThemeChange('light')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 cursor-pointer transition-colors ${
                      theme === 'light'
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-border/15 bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Sun className="w-4 h-4" />
                    <span>Light</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onThemeChange('dark')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 cursor-pointer transition-colors ${
                      theme === 'dark'
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-border/15 bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Moon className="w-4 h-4" />
                    <span>Dark</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onThemeChange('system')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 cursor-pointer transition-colors ${
                      theme === 'system'
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-border/15 bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Laptop className="w-4 h-4" />
                    <span>System</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-border/15">
                <h3 className="font-semibold text-foreground text-sm mb-2">Palette Identity</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Bamboo uses a disciplined muted sage and olive palette with warm cream and charcoal surfaces.
                  No fluorescent yellows or artificial gradients are used.
                </p>
              </div>
            </div>
          )}

          {/* --- CHAT BEHAVIOR --- */}
          {activeTab === 'chat' && (
            <div className="space-y-5 text-sm">
              <div>
                <h3 className="font-semibold text-foreground text-sm mb-2">Keyboard Shortcuts</h3>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enterToSend}
                    onChange={(e) =>
                      onUpdateSettings({ ...settings, enterToSend: e.target.checked })
                    }
                    className="mt-0.5 accent-primary rounded-lg"
                  />
                  <div>
                    <span className="font-medium text-foreground block">
                      Press Enter to send message
                    </span>
                    <span className="text-muted-foreground text-[13px]">
                      When checked, Enter sends and Shift+Enter creates a newline. When unchecked, Cmd/Ctrl+Enter sends.
                    </span>
                  </div>
                </label>
              </div>

              <div className="pt-4 border-t border-border/15">
                <h3 className="font-semibold text-foreground text-sm mb-2">Global System Prompt</h3>
                <p className="text-muted-foreground text-[13px] mb-2">
                  Default system instructions applied to conversations when no profile system prompt is set.
                </p>
                <textarea
                  rows={3}
                  value={settings.defaultSystemPrompt}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, defaultSystemPrompt: e.target.value })
                  }
                  placeholder="e.g. You are an expert engineer and clear communicator."
                  className="w-full p-2.5 rounded-xl border border-border/15 bg-muted/40 text-foreground resize-none focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/25 text-base"
                />
              </div>

              <div className="pt-4 border-t border-border/15 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-foreground">Model Profiles</h4>
                  <p className="text-muted-foreground text-[13px]">Configure custom endpoints and parameters.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenModelManager();
                  }}
                  className="px-4 py-2.5 rounded-xl border border-border/15 hover:bg-muted font-medium transition cursor-pointer"
                >
                  Manage models
                </button>
              </div>
            </div>
          )}

          {/* --- PROMPT PRESETS --- */}
          {activeTab === 'prompts' && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground text-sm">System Prompt Library</h3>
                  <p className="text-muted-foreground text-[13px]">Reusable prompts for different workflows.</p>
                </div>
                {!isAddingPrompt && (
                  <button
                    type="button"
                    onClick={() => setIsAddingPrompt(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground font-medium cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New preset</span>
                  </button>
                )}
              </div>

              {isAddingPrompt && (
                <form onSubmit={handleCreatePrompt} className="p-3 rounded-xl border border-border/15 bg-muted/20 space-y-2">
                  <input
                    type="text"
                    required
                    placeholder="Preset Title (e.g. Code Reviewer)"
                    value={newPromptTitle}
                    onChange={(e) => setNewPromptTitle(e.target.value)}
                    className="w-full px-2.5 py-1 text-sm rounded-lg border border-border/15 bg-card text-foreground"
                  />
                  <textarea
                    rows={3}
                    required
                    placeholder="Prompt content..."
                    value={newPromptContent}
                    onChange={(e) => setNewPromptContent(e.target.value)}
                    className="w-full p-2.5 text-sm rounded-lg border border-border/15 bg-card text-foreground resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingPrompt(false)}
                      className="px-2.5 py-1 text-sm rounded-lg text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 text-sm rounded-lg bg-primary text-primary-foreground font-medium"
                    >
                      Save Preset
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {prompts.length === 0 && !isAddingPrompt ? (
                  <p className="text-muted-foreground text-center py-6">
                    No custom presets created yet.
                  </p>
                ) : (
                  prompts.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-xl border border-border/15 bg-card flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground">{p.title}</div>
                        <div className="text-[13px] text-muted-foreground line-clamp-2 mt-0.5">
                          {p.content}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeletePrompt(p.id)}
                        className="p-1 rounded-lg text-muted-foreground hover:text-destructive transition cursor-pointer shrink-0"
                        title="Delete preset"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* --- STORAGE & DATA --- */}
          {activeTab === 'storage' && (
            <div className="space-y-5 text-sm">
              {/* Storage Stats */}
              <div className="p-3 rounded-xl border border-border/15 bg-card space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <Database className="w-4 h-4 text-primary" />
                  <span>Browser Storage (IndexedDB)</span>
                </div>
                <p className="text-muted-foreground text-[13px] leading-relaxed">
                  All messages, model profiles, and settings are stored locally on this device.
                  Approximate usage: <strong>{formatBytes(storageInfo.usage)}</strong>
                </p>
              </div>

              {/* Export Backup */}
              <div className="space-y-2 pt-2 border-t border-border/15">
                <h4 className="font-semibold text-foreground">Export Backup</h4>
                <p className="text-muted-foreground text-[13px]">
                  Download a complete JSON export of your profiles, conversations, and presets.
                </p>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={includeApiKeys}
                    onChange={(e) => setIncludeApiKeys(e.target.checked)}
                    className="accent-primary rounded-lg"
                  />
                  <span className="text-foreground">Include model API keys in export</span>
                </label>

                {includeApiKeys && (
                  <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-[13px] flex items-start gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Warning: Exported JSON file will contain sensitive API keys in readable plaintext.</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Export JSON Backup</span>
                </button>
              </div>

              {/* Import Backup */}
              <div className="space-y-2 pt-4 border-t border-border/15">
                <h4 className="font-semibold text-foreground">Import Backup</h4>
                <p className="text-muted-foreground text-[13px]">
                  Restore a previously exported Bamboo JSON file.
                </p>

                <div className="flex items-center gap-4 text-sm">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="merge"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="accent-primary"
                    />
                    <span>Merge with existing</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="accent-primary"
                    />
                    <span>Replace all records</span>
                  </label>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportFile}
                  accept=".json"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border/15 hover:bg-muted font-medium transition cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Select Backup JSON...</span>
                </button>

                {importStatus && (
                  <div
                    className={`p-2.5 rounded-lg text-[13px] flex items-start gap-1.5 ${
                      importStatus.success
                        ? 'bg-primary/10 border border-primary/30 text-foreground'
                        : 'bg-destructive/10 border border-destructive/30 text-destructive'
                    }`}
                  >
                    {importStatus.success ? (
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    )}
                    <span>{importStatus.message}</span>
                  </div>
                )}
              </div>

              {/* Clear All Data */}
              <div className="pt-4 border-t border-border/15">
                <h4 className="font-semibold text-destructive mb-1">Danger Zone</h4>
                {!isConfirmingClearAll ? (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingClearAll(true)}
                    className="px-4 py-2.5 rounded-xl border border-destructive/40 text-destructive hover:bg-destructive/10 font-medium transition cursor-pointer"
                  >
                    Clear all workspace data
                  </button>
                ) : (
                  <div className="p-3 rounded-xl border border-destructive/40 bg-destructive/10 space-y-2">
                    <p className="text-destructive font-medium">
                      Are you sure? This permanently erases all models, conversations, and presets from browser IndexedDB.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleClearAllData}
                        className="px-3 py-1 rounded-lg bg-destructive text-destructive-foreground font-medium cursor-pointer"
                      >
                        Yes, Erase Everything
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsConfirmingClearAll(false)}
                        className="px-3 py-1 rounded-lg border border-border/15 hover:bg-muted cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --- PWA & OFFLINE --- */}
          {activeTab === 'pwa' && (
            <div className="space-y-4 text-sm">
              <div className="p-3 rounded-xl border border-border/15 bg-card space-y-2">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <HardDrive className="w-4 h-4 text-primary" />
                  <span>Progressive Web App (PWA)</span>
                </div>
                <p className="text-muted-foreground text-[13px] leading-relaxed">
                  Bamboo can run offline as a standalone application. When offline, your conversation history,
                  model configurations, and presets remain fully accessible.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-foreground">How to Install</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[13px] leading-relaxed">
                  <li><strong>Chrome / Edge / Desktop:</strong> Click the "Install PWA" button in the header or the install icon in your address bar.</li>
                  <li><strong>iOS Safari:</strong> Tap the <em>Share</em> button in Safari toolbar, then select <em>Add to Home Screen</em>.</li>
                  <li><strong>Android Chrome:</strong> Tap the menu (three dots) and tap <em>Install app</em> or <em>Add to Home screen</em>.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
};

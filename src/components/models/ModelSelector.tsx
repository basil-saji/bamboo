import React, { useRef, useState } from 'react';
import { Check, ChevronDown, Plus, Settings2 } from 'lucide-react';
import type { ModelProfile } from '../../types';
import { FloatingPanel } from '../ui/FloatingPanel';

interface ModelSelectorProps {
  models: ModelProfile[];
  activeModel: ModelProfile | null;
  onSelectModel: (id: string) => void;
  onOpenModelManager: () => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  activeModel,
  onSelectModel,
  onOpenModelManager,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  if (models.length === 0) {
    return (
      <button
        type="button"
        onClick={onOpenModelManager}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border/20 px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted cursor-pointer"
        title="No models configured. Click to connect a model."
      >
        <Plus className="h-4 w-4 text-primary" />
        <span>Add model</span>
      </button>
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="inline-flex h-9 max-w-full items-center gap-1.5 rounded-full px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted data-[open=true]:bg-muted cursor-pointer"
        data-open={isOpen}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title="Switch model"
      >
        <span className="max-w-[110px] truncate sm:max-w-[200px]">
          {activeModel ? activeModel.name : 'Select model'}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <FloatingPanel
        open={isOpen}
        anchorRef={triggerRef}
        onClose={() => setIsOpen(false)}
        align="end"
        width={300}
        role="listbox"
        className="p-1.5 text-sm"
      >
        <div className="px-3 pb-1 pt-2 text-xs font-medium text-muted-foreground">
          Models ({models.length})
        </div>

        <div className="space-y-0.5">
          {models.map((m) => {
            const isSelected = activeModel?.id === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onSelectModel(m.id);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-muted cursor-pointer ${
                  isSelected ? 'bg-muted' : ''
                }`}
                role="option"
                aria-selected={isSelected}
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-foreground">{m.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{m.modelId}</div>
                </div>
                {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>

        <div className="mt-1.5 border-t border-border/10 pt-1.5">
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onOpenModelManager();
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <Settings2 className="h-4 w-4" />
            <span>Manage models…</span>
          </button>
        </div>
      </FloatingPanel>
    </>
  );
};

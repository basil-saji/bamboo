import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Plus, Settings2 } from 'lucide-react';
import type { ModelProfile } from '../../types';

interface ModelSelectorProps {
  models: ModelProfile[];
  activeModel: ModelProfile | null;
  onSelectModel: (id: string) => void;
  onOpenModelManager: () => void;
  compact?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  activeModel,
  onSelectModel,
  onOpenModelManager,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (models.length === 0) {
    return (
      <button
        type="button"
        onClick={onOpenModelManager}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-dashed border-border text-foreground/80 hover:text-foreground hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer"
        title="No models configured. Click to connect a model."
      >
        <Plus className="w-3.5 h-3.5 text-primary" />
        <span>Add model</span>
      </button>
    );
  }

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
          compact
            ? 'px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-muted/40'
            : 'px-2.5 py-1.5 border border-border bg-card hover:bg-muted/40 text-foreground'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate max-w-[140px] md:max-w-[200px]">
          {activeModel ? activeModel.name : 'Select model'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 mt-1 w-64 rounded-md border border-border bg-popover text-popover-foreground shadow-lg z-30 py-1 text-xs animate-in fade-in-0 zoom-in-95 duration-100"
          role="listbox"
        >
          <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Models ({models.length})
          </div>
          <div className="max-h-60 overflow-y-auto divide-y divide-border/20">
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
                  className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer ${
                    isSelected ? 'bg-muted/30 font-medium text-foreground' : 'text-foreground/80'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="truncate pr-2">
                    <div className="truncate text-foreground font-medium">{m.name}</div>
                    <div className="truncate text-[10px] text-muted-foreground font-mono">{m.modelId}</div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
          <div className="border-t border-border mt-1 pt-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenModelManager();
              }}
              className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Manage models...</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

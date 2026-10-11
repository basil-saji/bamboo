import React, { useEffect, useRef, useState } from 'react';
import {
  Download,
  Menu,
  MoreVertical,
  Pin,
  PinOff,
  Split,
  Trash2,
  WifiOff,
} from 'lucide-react';
import type { Conversation, ModelProfile } from '../../types';
import { ModelSelector } from '../models/ModelSelector';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface HeaderProps {
  conversation: Conversation | null;
  models: ModelProfile[];
  activeModel: ModelProfile | null;
  onSelectModel: (id: string) => void;
  onOpenModelManager: () => void;
  onToggleSidebar: () => void;
  onClearContext: () => void;
  onExportMarkdown: () => void;
  onTogglePin?: () => void;
  onDeleteConversation?: () => void;
  isOnline?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  conversation,
  models,
  activeModel,
  onSelectModel,
  onOpenModelManager,
  onToggleSidebar,
  onClearContext,
  onExportMarkdown,
  onTogglePin,
  onDeleteConversation,
  isOnline = true,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { isInstallable, install } = usePWAInstall();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur-xs px-3 md:px-4 flex items-center justify-between gap-3 shrink-0 z-20">
      {/* Left side: Toggle & Conversation Title */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
          title="Toggle sidebar"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="min-w-0 flex items-center gap-2">
          <h1 className="text-xs md:text-sm font-medium text-foreground truncate max-w-[160px] sm:max-w-[280px] md:max-w-[360px]">
            {conversation ? conversation.title : 'New conversation'}
          </h1>
          {conversation?.isPinned && (
            <Pin className="w-3 h-3 text-primary shrink-0" aria-label="Pinned" />
          )}
        </div>
      </div>

      {/* Right side: Offline alert, Model selector, PWA install & Conversation actions */}
      <div className="flex items-center gap-2 shrink-0">
        {!isOnline && (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-destructive/10 text-destructive border border-destructive/20">
            <WifiOff className="w-3 h-3" />
            <span className="hidden sm:inline">Offline</span>
          </div>
        )}

        {/* In-App PWA Install action if installable */}
        {isInstallable && (
          <button
            type="button"
            onClick={install}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-border bg-card hover:bg-muted/50 text-foreground transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span>Install PWA</span>
          </button>
        )}

        <ModelSelector
          models={models}
          activeModel={activeModel}
          onSelectModel={onSelectModel}
          onOpenModelManager={onOpenModelManager}
        />

        {/* Conversation overflow menu */}
        {conversation && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
              title="Conversation actions"
              aria-label="Conversation actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-1 w-48 rounded-md border border-border bg-popover text-popover-foreground shadow-lg z-30 py-1 text-xs animate-in fade-in-0 zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onClearContext();
                  }}
                  className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-muted/50 transition-colors text-foreground cursor-pointer"
                  title="Clear model context boundary"
                >
                  <Split className="w-3.5 h-3.5 text-primary" />
                  <span>Clear context boundary</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onExportMarkdown();
                  }}
                  className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-muted/50 transition-colors text-foreground cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Export Markdown</span>
                </button>

                {onTogglePin && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onTogglePin();
                    }}
                    className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-muted/50 transition-colors text-foreground cursor-pointer"
                  >
                    {conversation.isPinned ? (
                      <>
                        <PinOff className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Unpin conversation</span>
                      </>
                    ) : (
                      <>
                        <Pin className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Pin conversation</span>
                      </>
                    )}
                  </button>
                )}

                {onDeleteConversation && (
                  <div className="border-t border-border mt-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onDeleteConversation();
                      }}
                      className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-destructive/10 text-destructive transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete conversation</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

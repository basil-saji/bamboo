import React, { useRef, useState } from 'react';
import {
  Download,
  Ellipsis,
  PanelLeft,
  Pin,
  PinOff,
  Split,
  SquarePen,
  Trash2,
  WifiOff,
} from 'lucide-react';
import type { Conversation, ModelProfile } from '../../types';
import { ModelSelector } from '../models/ModelSelector';
import { FloatingPanel } from '../ui/FloatingPanel';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface HeaderProps {
  conversation: Conversation | null;
  models: ModelProfile[];
  activeModel: ModelProfile | null;
  onSelectModel: (id: string) => void;
  onOpenModelManager: () => void;
  onToggleSidebar: () => void;
  onNewConversation: () => void;
  /** Desktop sidebar is hidden → surface "new chat" in the header. */
  isSidebarCollapsed: boolean;
  onClearContext: () => void;
  onExportMarkdown: () => void;
  onTogglePin?: () => void;
  onDeleteConversation?: () => void;
  isOnline?: boolean;
}

const iconButton =
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground data-[open=true]:bg-foreground/10 data-[open=true]:text-foreground cursor-pointer';

const menuItem =
  'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted cursor-pointer';

export const Header: React.FC<HeaderProps> = ({
  conversation,
  models,
  activeModel,
  onSelectModel,
  onOpenModelManager,
  onToggleSidebar,
  onNewConversation,
  isSidebarCollapsed,
  onClearContext,
  onExportMarkdown,
  onTogglePin,
  onDeleteConversation,
  isOnline = true,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { isInstallable, install } = usePWAInstall();

  const run = (fn?: () => void) => () => {
    setIsMenuOpen(false);
    fn?.();
  };

  return (
    // Floats over the chat so the content blurs underneath it (glass navbar).
    <header
      className="absolute inset-x-0 top-0 z-30 flex h-[var(--header-h)] items-center justify-between gap-2 border-b border-border/10 bg-background/60 px-2 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl backdrop-saturate-150 supports-[not(backdrop-filter:blur(1px))]:bg-background/95 sm:px-3"
    >
      {/* Left: sidebar toggle, new chat, title */}
      <div className="flex min-w-0 items-center gap-1">
        <button
          type="button"
          onClick={onToggleSidebar}
          className={iconButton}
          title="Toggle sidebar"
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={onNewConversation}
          className={`${iconButton} ${isSidebarCollapsed ? '' : 'md:hidden'}`}
          title="New chat"
          aria-label="New chat"
        >
          <SquarePen className="h-5 w-5" />
        </button>

        <div className="ml-1 flex min-w-0 items-center gap-1.5">
          <h1 className="min-w-0 truncate text-sm font-medium text-foreground">
            {conversation ? conversation.title : 'New chat'}
          </h1>
          {conversation?.isPinned && (
            <Pin className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Pinned" />
          )}
        </div>
      </div>

      {/* Right: status, install, model switcher, actions */}
      <div className="flex shrink-0 items-center gap-0.5">
        {!isOnline && (
          <div className="mr-1 inline-flex items-center gap-1 rounded-full border border-destructive/25 bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">
            <WifiOff className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Offline</span>
          </div>
        )}

        {isInstallable && (
          <button
            type="button"
            onClick={install}
            className="mr-1 hidden h-9 items-center gap-1.5 rounded-full border border-border/20 px-3 text-sm font-medium text-foreground transition-colors hover:bg-foreground/10 sm:inline-flex cursor-pointer"
          >
            <Download className="h-4 w-4 text-primary" />
            <span>Install</span>
          </button>
        )}

        <ModelSelector
          models={models}
          activeModel={activeModel}
          onSelectModel={onSelectModel}
          onOpenModelManager={onOpenModelManager}
        />

        {conversation && (
          <>
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setIsMenuOpen((v) => !v)}
              className={iconButton}
              data-open={isMenuOpen}
              title="Conversation actions"
              aria-label="Conversation actions"
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
            >
              <Ellipsis className="h-5 w-5" />
            </button>

            <FloatingPanel
              open={isMenuOpen}
              anchorRef={menuButtonRef}
              onClose={() => setIsMenuOpen(false)}
              align="end"
              width={232}
              className="p-1.5"
            >
              <button type="button" role="menuitem" onClick={run(onClearContext)} className={menuItem}>
                <Split className="h-4 w-4 text-muted-foreground" />
                <span>Clear context boundary</span>
              </button>

              <button type="button" role="menuitem" onClick={run(onExportMarkdown)} className={menuItem}>
                <Download className="h-4 w-4 text-muted-foreground" />
                <span>Export as Markdown</span>
              </button>

              {onTogglePin && (
                <button type="button" role="menuitem" onClick={run(onTogglePin)} className={menuItem}>
                  {conversation.isPinned ? (
                    <>
                      <PinOff className="h-4 w-4 text-muted-foreground" />
                      <span>Unpin chat</span>
                    </>
                  ) : (
                    <>
                      <Pin className="h-4 w-4 text-muted-foreground" />
                      <span>Pin chat</span>
                    </>
                  )}
                </button>
              )}

              {onDeleteConversation && (
                <div className="mt-1.5 border-t border-border/10 pt-1.5">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={run(onDeleteConversation)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete chat</span>
                  </button>
                </div>
              )}
            </FloatingPanel>
          </>
        )}
      </div>
    </header>
  );
};

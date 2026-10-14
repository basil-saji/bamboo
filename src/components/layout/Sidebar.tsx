import React, { useMemo, useRef, useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  Ellipsis,
  Pencil,
  Pin,
  PinOff,
  Search,
  SquarePen,
  Trash2,
  X,
} from 'lucide-react';
import type { Conversation, ThemeMode, UserProfile } from '../../types';
import { BambooLogo } from '../ui/BambooLogo';
import { FloatingPanel } from '../ui/FloatingPanel';
import { ProfileMenu } from '../profile/ProfileMenu';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onUpdateTitle: (id: string, newTitle: string) => void;
  onTogglePin: (id: string) => void;
  onToggleArchive: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterArchived: boolean;
  setFilterArchived: (val: boolean) => void;
  onOpenModelManager: () => void;
  onOpenSettings: () => void;
  profile: UserProfile;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onOpenProfileModal: () => void;
  onLockWorkspace?: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

/** Group chats by last activity, like ChatGPT's "Today / Yesterday / Previous 7 days". */
function groupByDate(items: Conversation[]): { label: string; items: Conversation[] }[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const DAY = 86_400_000;

  const buckets: { label: string; min: number; items: Conversation[] }[] = [
    { label: 'Today', min: startOfToday, items: [] },
    { label: 'Yesterday', min: startOfToday - DAY, items: [] },
    { label: 'Previous 7 days', min: startOfToday - 7 * DAY, items: [] },
    { label: 'Previous 30 days', min: startOfToday - 30 * DAY, items: [] },
    { label: 'Older', min: -Infinity, items: [] },
  ];

  [...items]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .forEach((c) => {
      const bucket = buckets.find((b) => c.updatedAt >= b.min) ?? buckets[buckets.length - 1];
      bucket.items.push(c);
    });

  return buckets.filter((b) => b.items.length > 0).map(({ label, items }) => ({ label, items }));
}

const rowButton =
  'flex h-11 w-full items-center gap-3 rounded-xl px-3 text-[15px] text-sidebar-foreground transition-colors hover:bg-sidebar-accent cursor-pointer';

const SectionLabel: React.FC<{ children: React.ReactNode; icon?: React.ReactNode }> = ({ children, icon }) => (
  <div className="flex items-center gap-1.5 px-3 pb-1 pt-4 text-xs font-medium text-muted-foreground">
    {icon}
    <span>{children}</span>
  </div>
);

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onUpdateTitle,
  onTogglePin,
  onToggleArchive,
  onDeleteConversation,
  searchQuery,
  setSearchQuery,
  filterArchived,
  setFilterArchived,
  onOpenModelManager,
  onOpenSettings,
  profile,
  theme,
  onThemeChange,
  onOpenProfileModal,
  onLockWorkspace,
  isOpenMobile,
  onCloseMobile,
}) => {
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const pinned = useMemo(
    () => (filterArchived ? [] : conversations.filter((c) => c.isPinned)),
    [conversations, filterArchived]
  );
  const groups = useMemo(
    () => groupByDate(filterArchived ? conversations : conversations.filter((c) => !c.isPinned)),
    [conversations, filterArchived]
  );

  const startRename = (c: Conversation) => {
    setEditingConvId(c.id);
    setEditTitle(c.title);
  };

  const saveRename = (id: string) => {
    if (editTitle.trim()) onUpdateTitle(id, editTitle.trim());
    setEditingConvId(null);
  };

  const renderItem = (c: Conversation) => (
    <ConversationItem
      key={c.id}
      conversation={c}
      isActive={activeConversationId === c.id}
      isEditing={editingConvId === c.id}
      editTitle={editTitle}
      setEditTitle={setEditTitle}
      onSelect={() => {
        onSelectConversation(c.id);
        onCloseMobile();
      }}
      onStartRename={() => startRename(c)}
      onSaveRename={() => saveRename(c.id)}
      onCancelRename={() => setEditingConvId(null)}
      onTogglePin={() => onTogglePin(c.id)}
      onToggleArchive={() => onToggleArchive(c.id)}
      onDelete={() => onDeleteConversation(c.id)}
    />
  );

  const isEmpty = conversations.length === 0;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(85vw,18rem)] flex-col border-r border-sidebar-border/10 bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-out md:static md:z-auto md:h-full md:w-[260px] md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
        aria-label="Chats"
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-4 pb-1 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
          <BambooLogo size={24} showText />
          <button
            type="button"
            onClick={onCloseMobile}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground md:hidden cursor-pointer"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Primary actions */}
        <div className="space-y-0.5 px-2 pb-1 pt-2">
          <button
            type="button"
            onClick={() => {
              onNewConversation();
              onCloseMobile();
            }}
            className={`${rowButton} font-medium`}
          >
            <SquarePen className="h-[18px] w-[18px]" />
            <span>New chat</span>
          </button>

          <label className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-[15px] transition-colors focus-within:bg-sidebar-accent hover:bg-sidebar-accent">
            <Search className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search chats"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search chats"
              className="min-w-0 flex-1 bg-transparent text-[15px] text-sidebar-foreground placeholder:text-sidebar-foreground focus:outline-none max-md:text-base"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="rounded-full p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </label>

          <button type="button" onClick={() => setFilterArchived(!filterArchived)} className={rowButton}>
            {filterArchived ? (
              <ArchiveRestore className="h-[18px] w-[18px]" />
            ) : (
              <Archive className="h-[18px] w-[18px]" />
            )}
            <span>{filterArchived ? 'Back to chats' : 'Archived'}</span>
          </button>
        </div>

        {/* Conversation list */}
        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2">
          {isEmpty ? (
            <p className="px-3 py-10 text-center text-sm text-muted-foreground">
              {searchQuery ? 'No matching chats' : filterArchived ? 'No archived chats' : 'No chats yet'}
            </p>
          ) : (
            <>
              {pinned.length > 0 && (
                <section>
                  <SectionLabel icon={<Pin className="h-3 w-3" />}>Pinned</SectionLabel>
                  <div className="space-y-0.5">{pinned.map(renderItem)}</div>
                </section>
              )}

              {groups.map((g) => (
                <section key={g.label}>
                  <SectionLabel>{filterArchived ? 'Archived' : g.label}</SectionLabel>
                  <div className="space-y-0.5">{g.items.map(renderItem)}</div>
                </section>
              ))}
            </>
          )}
        </nav>

        {/* Profile footer */}
        <div className="border-t border-sidebar-border/10 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
          <ProfileMenu
            profile={profile}
            theme={theme}
            onThemeChange={onThemeChange}
            onOpenProfileModal={onOpenProfileModal}
            onOpenSettings={onOpenSettings}
            onOpenModelManager={onOpenModelManager}
            onLockWorkspace={onLockWorkspace}
          />
        </div>
      </aside>
    </>
  );
};

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  isEditing: boolean;
  editTitle: string;
  setEditTitle: (val: string) => void;
  onSelect: () => void;
  onStartRename: () => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onTogglePin: () => void;
  onToggleArchive: () => void;
  onDelete: () => void;
}

const menuItem =
  'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted cursor-pointer';

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  isEditing,
  editTitle,
  setEditTitle,
  onSelect,
  onStartRename,
  onSaveRename,
  onCancelRename,
  onTogglePin,
  onToggleArchive,
  onDelete,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const closeMenu = () => {
    setMenuOpen(false);
    setConfirmDelete(false);
  };

  if (isEditing) {
    return (
      <div className="flex h-10 items-center rounded-xl bg-sidebar-accent px-2">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSaveRename();
            if (e.key === 'Escape') {
              e.currentTarget.dataset.cancelled = 'true';
              onCancelRename();
            }
          }}
          onBlur={(e) => {
            if (e.currentTarget.dataset.cancelled !== 'true') onSaveRename();
          }}
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Rename chat"
          className="w-full rounded-md border border-border/20 bg-card px-2 py-1 text-base text-foreground focus:border-ring focus:outline-none md:text-sm"
        />
      </div>
    );
  }

  return (
    <div
      className={`group relative flex h-11 items-center rounded-xl text-[15px] transition-colors ${
        isActive || menuOpen
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground hover:bg-sidebar-accent/70'
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex h-full min-w-0 flex-1 items-center rounded-xl pl-3 pr-1 text-left cursor-pointer"
        title={conversation.title}
        aria-current={isActive ? 'page' : undefined}
      >
        <span className="truncate">{conversation.title}</span>
      </button>

      <button
        ref={menuButtonRef}
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className={`mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100 cursor-pointer ${
          menuOpen || isActive ? 'opacity-100' : 'opacity-0'
        }`}
        aria-label="Chat options"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <Ellipsis className="h-[18px] w-[18px]" />
      </button>

      <FloatingPanel
        open={menuOpen}
        anchorRef={menuButtonRef}
        onClose={closeMenu}
        align="start"
        width={200}
        className="p-1.5"
      >
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            closeMenu();
            onStartRename();
          }}
          className={menuItem}
        >
          <Pencil className="h-4 w-4 text-muted-foreground" />
          <span>Rename</span>
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            closeMenu();
            onTogglePin();
          }}
          className={menuItem}
        >
          {conversation.isPinned ? (
            <PinOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Pin className="h-4 w-4 text-muted-foreground" />
          )}
          <span>{conversation.isPinned ? 'Unpin' : 'Pin'}</span>
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            closeMenu();
            onToggleArchive();
          }}
          className={menuItem}
        >
          {conversation.isArchived ? (
            <ArchiveRestore className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Archive className="h-4 w-4 text-muted-foreground" />
          )}
          <span>{conversation.isArchived ? 'Restore' : 'Archive'}</span>
        </button>

        <div className="mt-1.5 border-t border-border/10 pt-1.5">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              if (!confirmDelete) {
                setConfirmDelete(true);
                return;
              }
              closeMenu();
              onDelete();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10 cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            <span>{confirmDelete ? 'Click again to delete' : 'Delete'}</span>
          </button>
        </div>
      </FloatingPanel>
    </div>
  );
};

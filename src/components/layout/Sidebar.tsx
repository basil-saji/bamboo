import React, { useState } from 'react';
import {
  Archive,
  Cpu,
  Edit2,
  FolderArchive,
  MessageSquare,
  MessageSquarePlus,
  Pin,
  PinOff,
  Search,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import type { Conversation } from '../../types';
import { BambooLogo } from '../ui/BambooLogo';

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
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

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
  isOpenMobile,
  onCloseMobile,
}) => {
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleStartRename = (c: Conversation) => {
    setEditingConvId(c.id);
    setEditTitle(c.title);
  };

  const handleSaveRename = (id: string) => {
    if (editTitle.trim()) {
      onUpdateTitle(id, editTitle.trim());
    }
    setEditingConvId(null);
  };

  const pinnedConversations = conversations.filter((c) => c.isPinned);
  const unpinnedConversations = conversations.filter((c) => !c.isPinned);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand & New Chat */}
        <div className="p-4 border-b border-sidebar-border/60">
          <div className="flex items-center justify-between mb-4">
            <BambooLogo size={24} showText={true} />
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1 rounded md:hidden text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 cursor-pointer"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              onNewConversation();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span>New conversation</span>
          </button>
        </div>

        {/* Search & Archive Filter */}
        <div className="px-3 py-2 border-b border-sidebar-border/40 space-y-1.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-sidebar-accent/40 border border-sidebar-border text-sidebar-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] px-1">
            <button
              type="button"
              onClick={() => setFilterArchived(!filterArchived)}
              className="text-muted-foreground hover:text-sidebar-foreground transition-colors flex items-center gap-1 cursor-pointer"
            >
              {filterArchived ? <FolderArchive className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
              <span>{filterArchived ? 'Showing archived' : 'View archived'}</span>
            </button>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-3">
          {conversations.length === 0 ? (
            <div className="text-center py-8 px-2 text-xs text-muted-foreground">
              {searchQuery ? (
                <span>No matching conversations.</span>
              ) : filterArchived ? (
                <span>No archived conversations.</span>
              ) : (
                <span>No conversations yet.</span>
              )}
            </div>
          ) : (
            <>
              {/* Pinned section */}
              {pinnedConversations.length > 0 && !filterArchived && (
                <div className="space-y-0.5">
                  <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Pin className="w-2.5 h-2.5" />
                    <span>Pinned</span>
                  </div>
                  {pinnedConversations.map((c) => (
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
                      onStartRename={() => handleStartRename(c)}
                      onSaveRename={() => handleSaveRename(c.id)}
                      onCancelRename={() => setEditingConvId(null)}
                      onTogglePin={() => onTogglePin(c.id)}
                      onToggleArchive={() => onToggleArchive(c.id)}
                      onDelete={() => onDeleteConversation(c.id)}
                    />
                  ))}
                </div>
              )}

              {/* Recent / Unpinned section */}
              {unpinnedConversations.length > 0 && (
                <div className="space-y-0.5">
                  {pinnedConversations.length > 0 && !filterArchived && (
                    <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Recent
                    </div>
                  )}
                  {unpinnedConversations.map((c) => (
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
                      onStartRename={() => handleStartRename(c)}
                      onSaveRename={() => handleSaveRename(c.id)}
                      onCancelRename={() => setEditingConvId(null)}
                      onTogglePin={() => onTogglePin(c.id)}
                      onToggleArchive={() => onToggleArchive(c.id)}
                      onDelete={() => onDeleteConversation(c.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer actions: Models & Settings */}
        <div className="p-3 border-t border-sidebar-border/60 space-y-1">
          <button
            type="button"
            onClick={() => {
              onOpenModelManager();
              onCloseMobile();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-md text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors cursor-pointer"
          >
            <Cpu className="w-4 h-4 text-primary shrink-0" />
            <span>Model Profiles</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenSettings();
              onCloseMobile();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-md text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4 text-muted-foreground shrink-0" />
            <span>Settings</span>
          </button>
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
  if (isEditing) {
    return (
      <div className="px-2 py-1.5 rounded-md bg-sidebar-accent/40 border border-sidebar-border">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSaveRename();
            if (e.key === 'Escape') onCancelRename();
          }}
          autoFocus
          className="w-full px-1.5 py-0.5 text-xs rounded bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <div className="flex items-center justify-end gap-1 mt-1 text-[11px]">
          <button
            type="button"
            onClick={onCancelRename}
            className="px-1.5 py-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSaveRename}
            className="px-2 py-0.5 rounded bg-primary text-primary-foreground font-medium cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative flex items-center justify-between px-2.5 py-2 rounded-md text-xs transition-colors cursor-pointer ${
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
          : 'text-sidebar-foreground/85 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 truncate pr-2">
        <MessageSquare className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{conversation.title}</span>
      </div>

      {/* Item actions */}
      <div
        className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onTogglePin}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
          title={conversation.isPinned ? 'Unpin' : 'Pin'}
        >
          {conversation.isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
        </button>
        <button
          type="button"
          onClick={onStartRename}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
          title="Rename"
        >
          <Edit2 className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={onToggleArchive}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
          title={conversation.isArchived ? 'Restore' : 'Archive'}
        >
          <Archive className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition cursor-pointer"
          title="Delete"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

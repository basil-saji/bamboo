import React, { useEffect, useState } from 'react';
import type { Attachment, UserProfile, UserSettings } from './types';
import { useConversations } from './hooks/useConversations';
import { useMessages } from './hooks/useMessages';
import { useModels } from './hooks/useModels';
import { useTheme } from './hooks/useTheme';
import {
  clearAllData,
  DEFAULT_PROFILE,
  DEFAULT_SETTINGS,
  getProfile,
  getSettings,
  saveProfile,
  saveSettings,
} from './lib/storage/db';
import { ChatComposer } from './components/composer/ChatComposer';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MessageList } from './components/chat/MessageList';
import { ModelManagerModal } from './components/models/ModelManagerModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { ProfileModal } from './components/profile/ProfileModal';
import { PasscodeUnlockModal } from './components/profile/PasscodeUnlockModal';
import { LoadingScreen } from './components/ui/LoadingScreen';

export const App: React.FC = () => {
  const { theme, setTheme } = useTheme();

  // Startup initialization state
  const [isAppReady, setIsAppReady] = useState<boolean>(false);

  // Settings
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  // Profile
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);

  // Online / Offline status
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Models
  const {
    models,
    activeModel,
    activeModelId,
    setActiveModelId,
    createModel,
    updateModel,
    duplicateModel,
    removeModel,
    setDefaultModel,
    reloadModels,
  } = useModels();

  // Conversations
  const {
    conversations,
    filteredConversations,
    activeConversation,
    activeConversationId,
    searchQuery,
    setSearchQuery,
    filterArchived,
    setFilterArchived,
    setActiveConversationId,
    createConversation,
    updateTitle,
    togglePin,
    toggleArchive,
    removeConversation,
    reloadConversations,
  } = useConversations();

  // Composer Input
  const [composerInput, setComposerInput] = useState('');

  // Modals & Navigation
  const [isModelManagerOpen, setIsModelManagerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [isSidebarCollapsedDesktop, setIsSidebarCollapsedDesktop] = useState(false);

  // Messages
  const {
    messages,
    generationState,
    sendMessage,
    stopGeneration,
    regenerateMessage,
    editUserMessage,
    clearContextBoundary,
    exportToMarkdown,
    reloadMessages,
  } = useMessages({
    conversationId: activeConversationId,
    activeModel,
    onAutoTitle: (convId, title) => updateTitle(convId, title),
    maxContextMessages: settings.maxContextMessages,
  });

  // App Startup Initialization
  useEffect(() => {
    let isMounted = true;
    async function initializeWorkspace() {
      try {
        const [loadedSettings, loadedProfile] = await Promise.all([
          getSettings(),
          getProfile(),
        ]);
        if (isMounted) {
          setSettings(loadedSettings);
          setProfile(loadedProfile);
          if (loadedProfile.hasPasscode) {
            setIsLocked(true);
          }
          setIsAppReady(true);
        }
      } catch (err) {
        console.warn('Initialization error, recovering:', err);
        if (isMounted) {
          setIsAppReady(true);
        }
      }
    }
    initializeWorkspace();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleUpdateSettings = async (newSettings: UserSettings) => {
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  const handleSendMessage = async (content: string, attachments?: Attachment[]) => {
    if (!activeConversationId) {
      const newConv = await createConversation('New conversation', activeModel?.id);
      setTimeout(async () => {
        try {
          await sendMessage(content, attachments);
        } catch {
          // Handled
        }
      }, 50);
      return;
    }

    try {
      await sendMessage(content, attachments);
    } catch {
      // Handled
    }
  };

  const handleNewConversation = async () => {
    await createConversation('New conversation', activeModel?.id);
  };

  const handleExportConversationMarkdown = async () => {
    const md = await exportToMarkdown(activeConversation?.title || 'conversation');
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(activeConversation?.title || 'conversation').replace(/[^a-z0-9_-]/gi, '_')}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDataReset = () => {
    reloadModels();
    reloadConversations();
    reloadMessages();
    getSettings().then(setSettings);
    getProfile().then(setProfile);
  };

  return (
    <>
      {/* Branded Startup Loading Screen */}
      <LoadingScreen
        isReady={isAppReady}
        onRetry={() => {
          getSettings().then(setSettings);
          getProfile().then(setProfile);
          setIsAppReady(true);
        }}
        onResetStorage={async () => {
          await clearAllData();
          window.location.reload();
        }}
      />

      {/* Main Application Shell */}
      <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans">
        {/* Sidebar */}
        <div className={`${isSidebarCollapsedDesktop ? 'md:hidden' : 'md:flex md:w-64'} shrink-0`}>
          <Sidebar
            conversations={filteredConversations}
            activeConversationId={activeConversationId}
            onSelectConversation={setActiveConversationId}
            onNewConversation={handleNewConversation}
            onUpdateTitle={updateTitle}
            onTogglePin={togglePin}
            onToggleArchive={toggleArchive}
            onDeleteConversation={removeConversation}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filterArchived={filterArchived}
            setFilterArchived={setFilterArchived}
            onOpenModelManager={() => setIsModelManagerOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            profile={profile}
            theme={theme}
            onThemeChange={setTheme}
            onOpenProfileModal={() => setIsProfileModalOpen(true)}
            onLockWorkspace={() => setIsLocked(true)}
            isOpenMobile={isSidebarOpenMobile}
            onCloseMobile={() => setIsSidebarOpenMobile(false)}
          />
        </div>

        {/* Main Workspace */}
        <main className="flex-1 flex flex-col h-full min-w-0 relative">
          <Header
            conversation={activeConversation}
            models={models}
            activeModel={activeModel}
            onSelectModel={setActiveModelId}
            onOpenModelManager={() => setIsModelManagerOpen(true)}
            onToggleSidebar={() => {
              if (window.innerWidth < 768) {
                setIsSidebarOpenMobile(!isSidebarOpenMobile);
              } else {
                setIsSidebarCollapsedDesktop(!isSidebarCollapsedDesktop);
              }
            }}
            onClearContext={clearContextBoundary}
            onExportMarkdown={handleExportConversationMarkdown}
            onTogglePin={() => activeConversationId && togglePin(activeConversationId)}
            onDeleteConversation={() => activeConversationId && removeConversation(activeConversationId)}
            isOnline={isOnline}
          />

          {/* Messages & Empty Chat State */}
          <MessageList
            messages={messages}
            models={models}
            activeModel={activeModel}
            onOpenModelManager={() => setIsModelManagerOpen(true)}
            onSelectPrompt={(prompt) => {
              setComposerInput(prompt);
            }}
            onRegenerateMessage={regenerateMessage}
            onEditUserMessage={editUserMessage}
          />

          {/* Floating Composer */}
          <ChatComposer
            input={composerInput}
            setInput={setComposerInput}
            onSend={handleSendMessage}
            onStop={stopGeneration}
            generationState={generationState}
            models={models}
            activeModel={activeModel}
            onSelectModel={setActiveModelId}
            onOpenModelManager={() => setIsModelManagerOpen(true)}
            enterToSend={settings.enterToSend}
          />
        </main>

        {/* Model Manager Modal */}
        <ModelManagerModal
          isOpen={isModelManagerOpen}
          onClose={() => setIsModelManagerOpen(false)}
          models={models}
          activeModelId={activeModelId}
          onSelectModel={setActiveModelId}
          onCreateModel={createModel}
          onUpdateModel={updateModel}
          onDuplicateModel={duplicateModel}
          onRemoveModel={removeModel}
          onSetDefaultModel={setDefaultModel}
        />

        {/* Settings Modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          theme={theme}
          onThemeChange={setTheme}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onOpenModelManager={() => setIsModelManagerOpen(true)}
          onDataReset={handleDataReset}
        />

        {/* Profile Modal */}
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          profile={profile}
          onProfileUpdated={(up) => setProfile(up)}
        />

        {/* Passcode Unlock Modal */}
        <PasscodeUnlockModal
          isLocked={isLocked}
          profile={profile}
          onUnlock={() => setIsLocked(false)}
          onResetPasscode={() => {
            getProfile().then(setProfile);
          }}
        />
      </div>
    </>
  );
};

export default App;

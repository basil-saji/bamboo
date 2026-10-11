import React, { useRef, useState } from 'react';
import type { ThemeMode, UserProfile } from '../../types';
import { ChevronsUpDown, Cpu, Lock, Monitor, Moon, Settings, Sun, User } from 'lucide-react';
import { FloatingPanel } from '../ui/FloatingPanel';

interface ProfileMenuProps {
  profile: UserProfile;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onOpenProfileModal: () => void;
  onOpenSettings: () => void;
  onOpenModelManager: () => void;
  onLockWorkspace?: () => void;
}

const menuItem =
  'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted cursor-pointer';

export const ProfileMenu: React.FC<ProfileMenuProps> = ({
  profile,
  theme,
  onThemeChange,
  onOpenProfileModal,
  onOpenSettings,
  onOpenModelManager,
  onLockWorkspace,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const initials = profile.avatarInitials || profile.username.slice(0, 2).toUpperCase() || 'U';

  const cycleTheme = () => {
    if (theme === 'light') onThemeChange('dark');
    else if (theme === 'dark') onThemeChange('system');
    else onThemeChange('light');
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  const run = (fn: () => void) => () => {
    setIsOpen(false);
    fn();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-xl p-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent data-[open=true]:bg-sidebar-accent cursor-pointer"
        data-open={isOpen}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {initials}
          </div>
          <div className="min-w-0 text-left">
            <span className="block truncate text-sm font-medium text-foreground">{profile.username}</span>
            {profile.bio && (
              <span className="block truncate text-xs text-muted-foreground">{profile.bio}</span>
            )}
          </div>
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      <FloatingPanel
        open={isOpen}
        anchorRef={triggerRef}
        onClose={() => setIsOpen(false)}
        align="start"
        width={248}
        className="p-1.5"
      >
        <div className="px-3 pb-2 pt-1.5">
          <div className="truncate text-sm font-medium text-foreground">{profile.username}</div>
          <div className="truncate text-xs text-muted-foreground">Local personal workspace</div>
        </div>

        <div className="border-t border-border/10 pt-1.5">
          <button type="button" role="menuitem" onClick={run(onOpenProfileModal)} className={menuItem}>
            <User className="h-4 w-4 text-muted-foreground" />
            <span>Profile &amp; personalization</span>
          </button>

          <button type="button" role="menuitem" onClick={run(onOpenModelManager)} className={menuItem}>
            <Cpu className="h-4 w-4 text-muted-foreground" />
            <span>Model profiles</span>
          </button>

          <button type="button" role="menuitem" onClick={run(onOpenSettings)} className={menuItem}>
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span>Settings</span>
          </button>

          <button type="button" role="menuitem" onClick={cycleTheme} className={`${menuItem} justify-between`}>
            <span className="flex items-center gap-2.5">
              <ThemeIcon className="h-4 w-4 text-muted-foreground" />
              <span>Theme</span>
            </span>
            <span className="text-xs capitalize text-muted-foreground">{theme}</span>
          </button>
        </div>

        {profile.hasPasscode && onLockWorkspace && (
          <div className="mt-1.5 border-t border-border/10 pt-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={run(onLockWorkspace)}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10 cursor-pointer"
            >
              <Lock className="h-4 w-4" />
              <span>Lock workspace</span>
            </button>
          </div>
        )}
      </FloatingPanel>
    </>
  );
};

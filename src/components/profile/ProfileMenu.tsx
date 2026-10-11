import React, { useEffect, useRef, useState } from 'react';
import type { ThemeMode, UserProfile } from '../../types';
import {
  ChevronUp,
  Cpu,
  Lock,
  Moon,
  Settings,
  Sun,
  User,
} from 'lucide-react';

interface ProfileMenuProps {
  profile: UserProfile;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onOpenProfileModal: () => void;
  onOpenSettings: () => void;
  onOpenModelManager: () => void;
  onLockWorkspace?: () => void;
}

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
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
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

  const initials = profile.avatarInitials || profile.username.slice(0, 2).toUpperCase() || 'U';

  const toggleTheme = () => {
    if (theme === 'light') onThemeChange('dark');
    else if (theme === 'dark') onThemeChange('system');
    else onThemeChange('light');
  };

  return (
    <div className="relative w-full" ref={menuRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-sidebar-accent/50 text-sidebar-foreground transition-colors cursor-pointer group"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-full bg-primary/15 text-primary border border-primary/25 flex items-center justify-center font-serif font-bold text-xs shrink-0 select-none">
            {initials}
          </div>
          <div className="text-left min-w-0">
            <span className="text-xs font-medium text-foreground block truncate">
              {profile.username}
            </span>
            {profile.bio && (
              <span className="text-[10px] text-muted-foreground block truncate">
                {profile.bio}
              </span>
            )}
          </div>
        </div>

        <ChevronUp className={`w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0 ${isOpen ? '' : 'rotate-180'}`} />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          className="absolute bottom-full left-0 mb-1.5 w-60 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl z-50 py-1.5 text-xs animate-in fade-in-0 zoom-in-95 duration-100"
          role="menu"
        >
          <div className="px-3 py-2 border-b border-border/50">
            <div className="font-medium text-foreground text-xs truncate">{profile.username}</div>
            <div className="text-[11px] text-muted-foreground truncate">Local Personal Workspace</div>
          </div>

          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenProfileModal();
              }}
              className="w-full text-left px-3 py-2 flex items-center gap-2 text-foreground hover:bg-muted/50 transition cursor-pointer"
              role="menuitem"
            >
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Profile & Personalization</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenModelManager();
              }}
              className="w-full text-left px-3 py-2 flex items-center gap-2 text-foreground hover:bg-muted/50 transition cursor-pointer"
              role="menuitem"
            >
              <Cpu className="w-3.5 h-3.5 text-primary" />
              <span>Model Profiles</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenSettings();
              }}
              className="w-full text-left px-3 py-2 flex items-center gap-2 text-foreground hover:bg-muted/50 transition cursor-pointer"
              role="menuitem"
            >
              <Settings className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Settings</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="w-full text-left px-3 py-2 flex items-center justify-between text-foreground hover:bg-muted/50 transition cursor-pointer"
              role="menuitem"
            >
              <div className="flex items-center gap-2">
                {theme === 'dark' ? (
                  <Moon className="w-3.5 h-3.5 text-primary" />
                ) : (
                  <Sun className="w-3.5 h-3.5 text-primary" />
                )}
                <span>Theme</span>
              </div>
              <span className="text-[11px] text-muted-foreground capitalize font-mono">
                {theme}
              </span>
            </button>

            {profile.hasPasscode && onLockWorkspace && (
              <div className="border-t border-border/50 mt-1 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onLockWorkspace();
                  }}
                  className="w-full text-left px-3 py-2 flex items-center gap-2 text-destructive hover:bg-destructive/10 transition cursor-pointer"
                  role="menuitem"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock Workspace</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

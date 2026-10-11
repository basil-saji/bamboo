import React, { useState } from 'react';
import type { UserProfile } from '../../types';
import { createPasscodeCredentials } from '../../lib/security/local-auth';
import { clearPasscode, saveProfile } from '../../lib/storage/db';
import { Dialog } from '../ui/Dialog';
import { KeyRound, Shield, ShieldAlert, User } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onProfileUpdated: (updated: UserProfile) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onProfileUpdated,
}) => {
  const [username, setUsername] = useState(profile.username);
  const [avatarInitials, setAvatarInitials] = useState(profile.avatarInitials || 'U');
  const [bio, setBio] = useState(profile.bio || '');

  // Passcode lock setup state
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [passcodeSuccess, setPasscodeSuccess] = useState<string | null>(null);

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    const initials = avatarInitials.trim() || username.trim().slice(0, 2).toUpperCase();

    const updated: UserProfile = {
      ...profile,
      username: username.trim(),
      avatarInitials: initials,
      bio: bio.trim(),
      updatedAt: Date.now(),
    };

    await saveProfile(updated);
    onProfileUpdated(updated);
    onClose();
  };

  const handleSetPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeError(null);
    setPasscodeSuccess(null);

    if (newPasscode.length < 4) {
      setPasscodeError('Passcode must be at least 4 characters.');
      return;
    }

    if (newPasscode !== confirmPasscode) {
      setPasscodeError('Passcodes do not match.');
      return;
    }

    try {
      const credentials = await createPasscodeCredentials(newPasscode);
      const updated: UserProfile = {
        ...profile,
        hasPasscode: true,
        passcodeSaltHex: credentials.saltHex,
        passcodeHashHex: credentials.hashHex,
        passcodeIterations: credentials.iterations,
        updatedAt: Date.now(),
      };

      await saveProfile(updated);
      onProfileUpdated(updated);
      setNewPasscode('');
      setConfirmPasscode('');
      setPasscodeSuccess('Local passcode lock enabled successfully.');
    } catch (err: unknown) {
      setPasscodeError('Failed to generate encryption verifier.');
    }
  };

  const handleRemovePasscode = async () => {
    await clearPasscode();
    const updated: UserProfile = {
      ...profile,
      hasPasscode: false,
      passcodeSaltHex: undefined,
      passcodeHashHex: undefined,
      passcodeIterations: undefined,
      updatedAt: Date.now(),
    };
    onProfileUpdated(updated);
    setPasscodeSuccess('Local passcode lock removed.');
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="User Profile & Personalization"
      description="Personalize your local workspace profile and optional device lock."
      maxWidth="max-w-lg"
    >
      <div className="space-y-6 text-xs">
        {/* Profile Info Form */}
        <form onSubmit={handleSaveInfo} className="space-y-3">
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 text-primary font-bold text-base flex items-center justify-center shrink-0">
              {avatarInitials.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-foreground text-sm block">Personal Profile</span>
              <span className="text-muted-foreground text-[11px]">
                Stored entirely on this device in browser IndexedDB.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-[11px] font-medium text-foreground mb-1">
                Display Name / Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (!avatarInitials || avatarInitials === profile.avatarInitials) {
                    setAvatarInitials(e.target.value.slice(0, 2).toUpperCase());
                  }
                }}
                className="w-full px-2.5 py-1.5 text-xs rounded-md border border-border bg-input/20 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-foreground mb-1">
                Avatar Initials
              </label>
              <input
                type="text"
                maxLength={3}
                value={avatarInitials}
                onChange={(e) => setAvatarInitials(e.target.value.toUpperCase())}
                className="w-full px-2.5 py-1.5 text-xs rounded-md border border-border bg-input/20 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-ring text-center"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-foreground mb-1">
              Short Bio or Role (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Software Engineer & Researcher"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-md border border-border bg-input/20 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 transition cursor-pointer"
            >
              Save Profile
            </button>
          </div>
        </form>

        {/* Local Device Lock Section */}
        <div className="pt-4 border-t border-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-primary" />
              <span className="font-semibold text-foreground text-xs">Local Device Privacy Lock</span>
            </div>
            {profile.hasPasscode && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-primary/10 text-primary border border-primary/20">
                Lock Enabled
              </span>
            )}
          </div>

          {/* Security Disclaimer Notice */}
          <div className="p-2.5 rounded-md border border-border bg-muted/30 text-[11px] leading-relaxed text-muted-foreground space-y-1">
            <p>
              <strong>Security Model:</strong> This local lock is a convenience feature to prevent casual inspection or shoulder-surfing on your current device. It uses browser-native Web Crypto PBKDF2 (100,000 rounds).
            </p>
            <p className="text-destructive/80">
              It does not protect against someone with root access or browser developer tools. No password is sent to any server. If you forget your passcode, you can reset it by clearing local encryption credentials.
            </p>
          </div>

          {profile.hasPasscode ? (
            <div className="flex items-center justify-between p-2.5 rounded-md border border-border bg-card">
              <div>
                <span className="font-medium text-foreground block">Passcode protection active</span>
                <span className="text-muted-foreground text-[11px]">
                  Requires passcode to unlock workspace.
                </span>
              </div>
              <button
                type="button"
                onClick={handleRemovePasscode}
                className="px-2.5 py-1 rounded border border-destructive/40 text-destructive hover:bg-destructive/10 text-xs font-medium cursor-pointer"
              >
                Disable Lock
              </button>
            </div>
          ) : (
            <form onSubmit={handleSetPasscode} className="space-y-2 p-3 rounded-lg border border-border bg-card">
              <span className="font-medium text-foreground block">Enable Passcode Lock</span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="password"
                  required
                  placeholder="New passcode"
                  value={newPasscode}
                  onChange={(e) => setNewPasscode(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded border border-border bg-input/20 text-foreground"
                />
                <input
                  type="password"
                  required
                  placeholder="Confirm passcode"
                  value={confirmPasscode}
                  onChange={(e) => setConfirmPasscode(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded border border-border bg-input/20 text-foreground"
                />
              </div>

              {passcodeError && (
                <p className="text-[11px] text-destructive flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  <span>{passcodeError}</span>
                </p>
              )}

              {passcodeSuccess && (
                <p className="text-[11px] text-primary">
                  {passcodeSuccess}
                </p>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs font-medium cursor-pointer"
                >
                  Enable Lock
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Dialog>
  );
};

import React, { useState } from 'react';
import type { UserProfile } from '../../types';
import { verifyPasscode } from '../../lib/security/local-auth';
import { clearPasscode } from '../../lib/storage/db';
import { BambooLogo } from '../ui/BambooLogo';
import { KeyRound, Lock, ShieldAlert } from 'lucide-react';

interface PasscodeUnlockModalProps {
  isLocked: boolean;
  profile: UserProfile;
  onUnlock: () => void;
  onResetPasscode: () => void;
}

export const PasscodeUnlockModal: React.FC<PasscodeUnlockModalProps> = ({
  isLocked,
  profile,
  onUnlock,
  onResetPasscode,
}) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isResetConfirming, setIsResetConfirming] = useState(false);

  if (!isLocked) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!profile.passcodeSaltHex || !profile.passcodeHashHex) {
      onUnlock();
      return;
    }

    const isValid = await verifyPasscode(
      passcode,
      profile.passcodeSaltHex,
      profile.passcodeHashHex,
      profile.passcodeIterations
    );

    if (isValid) {
      setPasscode('');
      setError(null);
      onUnlock();
    } else {
      setError('Incorrect passcode.');
    }
  };

  const handleConfirmReset = async () => {
    await clearPasscode();
    setIsResetConfirming(false);
    onResetPasscode();
    onUnlock();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-md select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lock-title"
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl text-center">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3">
          <Lock className="w-5 h-5" />
        </div>

        <h2 id="lock-title" className="text-base font-semibold text-foreground mb-1">
          workspace locked
        </h2>
        <p className="text-xs text-muted-foreground mb-5">
          Enter your local device passcode to continue as <strong className="text-foreground">{profile.username}</strong>.
        </p>

        {!isResetConfirming ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="password"
              autoFocus
              required
              placeholder="Enter passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full px-3 py-2 text-sm text-center rounded-lg border border-border bg-input/20 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />

            {error && (
              <p className="text-xs text-destructive flex items-center justify-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{error}</span>
              </p>
            )}

            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition cursor-pointer"
            >
              Unlock Workspace
            </button>

            <button
              type="button"
              onClick={() => setIsResetConfirming(true)}
              className="text-[11px] text-muted-foreground hover:text-foreground transition underline cursor-pointer pt-2 block mx-auto"
            >
              Forgot Passcode?
            </button>
          </form>
        ) : (
          <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-xs text-left space-y-2">
            <p className="font-semibold text-destructive">Reset Local Passcode</p>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Because this lock is purely local and stores no passwords on a server, clearing encryption credentials resets the lock immediately.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-2.5 py-1 rounded bg-destructive text-destructive-foreground text-xs font-medium cursor-pointer"
              >
                Reset & Unlock
              </button>
              <button
                type="button"
                onClick={() => setIsResetConfirming(false)}
                className="px-2.5 py-1 rounded border border-border hover:bg-muted text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

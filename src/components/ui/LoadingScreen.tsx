import React, { useEffect, useState } from 'react';
import { BambooLogo } from './BambooLogo';
import { RotateCw, AlertCircle } from 'lucide-react';

interface LoadingScreenProps {
  isReady: boolean;
  onRetry?: () => void;
  onResetStorage?: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  isReady,
  onRetry,
  onResetStorage,
}) => {
  const [shouldRender, setShouldRender] = useState(!isReady);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isDelayed, setIsDelayed] = useState(false);

  useEffect(() => {
    // If initialization takes longer than 4 seconds, offer recovery
    const timer = setTimeout(() => {
      if (!isReady) {
        setIsDelayed(true);
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, [isReady]);

  useEffect(() => {
    if (isReady) {
      setIsFadingOut(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setShouldRender(true);
      setIsFadingOut(false);
    }
  }, [isReady]);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background text-foreground transition-opacity duration-200 select-none ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center text-center px-4 max-w-sm">
        {/* Animated Bamboo Logo */}
        <div className="relative mb-3 flex items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-card border border-border flex items-center justify-center shadow-xs">
            <BambooLogo size={32} className="text-primary animate-pulse" />
          </div>
        </div>

        {/* Wordmark */}
        <h1 className="font-serif font-semibold text-xl tracking-tight text-foreground lowercase mb-1">
          bamboo
        </h1>
        <p className="text-xs text-muted-foreground font-sans">
          Initializing local workspace...
        </p>

        {/* Recovery state if initialization stalls */}
        {isDelayed && (
          <div className="mt-8 p-3 rounded-lg border border-border bg-card text-xs text-left w-full space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <AlertCircle className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Workspace taking longer to load</span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              IndexedDB may be waiting for a locked transaction from another browser tab.
            </p>
            <div className="flex items-center gap-2 pt-1">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="px-2.5 py-1 rounded bg-primary text-primary-foreground text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              )}
              {onResetStorage && (
                <button
                  type="button"
                  onClick={onResetStorage}
                  className="px-2.5 py-1 rounded border border-destructive/40 text-destructive text-xs hover:bg-destructive/10 cursor-pointer"
                >
                  Reset Workspace
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

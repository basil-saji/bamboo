import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface FloatingPanelProps {
  open: boolean;
  /** Element the panel is attached to (trigger button). */
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  /** Which edge of the anchor the panel lines up with. */
  align?: 'start' | 'end';
  /** Preferred width in px. Shrinks automatically on narrow screens. */
  width?: number;
  gap?: number;
  role?: string;
  className?: string;
  children: React.ReactNode;
}

const VIEWPORT_MARGIN = 8;

/**
 * Popover rendered in a portal with `position: fixed`.
 *
 * - never clipped by `overflow-hidden` / scroll containers
 * - clamped horizontally so it can never leave the screen
 * - flips above the anchor when there is no room below, and scrolls
 *   internally when it is taller than the available space
 */
export const FloatingPanel: React.FC<FloatingPanelProps> = ({
  open,
  anchorRef,
  onClose,
  align = 'start',
  width = 288,
  gap = 6,
  role = 'menu',
  className = '',
  children,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({ visibility: 'hidden' });

  const reposition = useCallback(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;

    const rect = anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const w = Math.min(width, vw - VIEWPORT_MARGIN * 2);
    let left = align === 'end' ? rect.right - w : rect.left;
    left = Math.max(VIEWPORT_MARGIN, Math.min(left, vw - w - VIEWPORT_MARGIN));

    const contentHeight = panel.scrollHeight;
    const spaceBelow = vh - rect.bottom - gap - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - gap - VIEWPORT_MARGIN;
    const openUp = contentHeight > spaceBelow && spaceAbove > spaceBelow;
    const maxHeight = Math.max(160, openUp ? spaceAbove : spaceBelow);

    setStyle({
      position: 'fixed',
      left,
      width: w,
      maxHeight,
      ...(openUp
        ? { bottom: vh - rect.top + gap, top: 'auto', transformOrigin: align === 'end' ? 'bottom right' : 'bottom left' }
        : { top: rect.bottom + gap, bottom: 'auto', transformOrigin: align === 'end' ? 'top right' : 'top left' }),
      visibility: 'visible',
    });
  }, [align, anchorRef, gap, width]);

  // Position before paint so the panel never flashes in the wrong place
  useLayoutEffect(() => {
    if (!open) {
      setStyle({ visibility: 'hidden' });
      return;
    }
    reposition();
  }, [open, reposition, children]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return; // the trigger toggles itself
      onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown, { passive: true });
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    window.visualViewport?.addEventListener('resize', reposition);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
      window.visualViewport?.removeEventListener('resize', reposition);
    };
  }, [open, onClose, reposition, anchorRef]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={panelRef}
      role={role}
      style={style}
      className={`bamboo-pop z-[70] overflow-y-auto overscroll-contain rounded-2xl border border-border/15 bg-popover/95 text-popover-foreground shadow-xl backdrop-blur-xl ${className}`}
    >
      {children}
    </div>,
    document.body
  );
};

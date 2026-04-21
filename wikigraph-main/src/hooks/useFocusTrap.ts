import { type RefObject, useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(active: boolean, containerRef: RefObject<HTMLElement | null>) {
  const prevFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    prevFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const getOrderedFocusable = (): HTMLElement[] => {
      return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    };

    const focusable = getOrderedFocusable();
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const nodes = getOrderedFocusable();
      if (nodes.length === 0) return;
      const f = nodes[0];
      const l = nodes[nodes.length - 1];
      if (nodes.length === 1) {
        if (document.activeElement === f) {
          e.preventDefault();
        }
        return;
      }
      if (e.shiftKey) {
        if (document.activeElement === f) {
          e.preventDefault();
          l?.focus();
        }
      } else {
        if (document.activeElement === l) {
          e.preventDefault();
          f?.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      prevFocusRef.current?.focus?.();
    };
  }, [active, containerRef]);
}

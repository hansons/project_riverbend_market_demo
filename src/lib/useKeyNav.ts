import { useEffect, useRef } from 'react';

// Shared keyboard-navigation primitives. The typing-guard lives here once so bare
// WASD / arrow keys never hijack text entry: a keystroke is ignored when a modifier
// is held or focus is in an editable field.

export function isTypingTarget(e: KeyboardEvent): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return true;
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  return t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable;
}

interface KeyNavOpts {
  length: number;
  index: number;
  onIndex: (i: number) => void;
  prevKeys: string[]; // lowercased e.key values, e.g. ['w', 'arrowup']
  nextKeys: string[];
  enabled?: boolean;
  wrap?: boolean;
}

/**
 * Step an indexed list with prev/next keys. One window listener, registered once;
 * latest props are read through a ref so the handler never goes stale and never
 * re-subscribes on every render.
 */
export function useKeyNav(opts: KeyNavOpts): void {
  const ref = useRef(opts);
  ref.current = opts;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const o = ref.current;
      if (o.enabled === false || o.length <= 0) return;
      if (isTypingTarget(e)) return;
      const k = e.key.toLowerCase();
      const dir = o.prevKeys.includes(k) ? -1 : o.nextKeys.includes(k) ? 1 : 0;
      if (dir === 0) return;
      e.preventDefault();
      const base = o.index < 0 ? 0 : o.index;
      let ni = base + dir;
      if (o.wrap) ni = (ni + o.length) % o.length;
      if (ni < 0 || ni >= o.length) return;
      o.onIndex(ni);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

interface HotkeyOpts {
  enabled?: boolean;
  /** Let the key fire even while typing (e.g. Esc to close an overlay). */
  allowInInputs?: boolean;
}

/** Fire `handler` when one of `keys` (lowercased e.key) is pressed. Guarded against
 *  typing unless `allowInInputs`. Modifier combos are always ignored. */
export function useHotkey(keys: string[], handler: () => void, opts: HotkeyOpts = {}): void {
  const ref = useRef({ keys, handler, opts });
  ref.current = { keys, handler, opts };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const { keys, handler, opts } = ref.current;
      if (opts.enabled === false) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (!opts.allowInInputs && isTypingTarget(e)) return;
      if (!keys.includes(e.key.toLowerCase())) return;
      e.preventDefault();
      handler();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

import { useEffect, useCallback } from 'react';

interface ShortcutConfig {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  action: () => void;
  preventDefault?: boolean;
}

export function useKeyboardShortcut(config: ShortcutConfig) {
  const { key, ctrlKey = false, metaKey = false, shiftKey = false, action, preventDefault = true } = config;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const matchesCtrl = ctrlKey ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
    const matchesMeta = metaKey ? event.metaKey : true;
    const matchesShift = shiftKey ? event.shiftKey : !event.shiftKey;

    if (event.key.toLowerCase() === key.toLowerCase() && matchesCtrl && matchesMeta && matchesShift) {
      if (preventDefault) {
        event.preventDefault();
      }
      action();
    }
  }, [key, ctrlKey, metaKey, shiftKey, action, preventDefault]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      const { key, ctrlKey = false, metaKey = false, shiftKey = false, action, preventDefault = true } = shortcut;

      const matchesCtrl = ctrlKey ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
      const matchesMeta = metaKey ? event.metaKey : true;
      const matchesShift = shiftKey ? event.shiftKey : !event.shiftKey;

      if (event.key.toLowerCase() === key.toLowerCase() && matchesCtrl && matchesMeta && matchesShift) {
        if (preventDefault) {
          event.preventDefault();
        }
        action();
        break;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
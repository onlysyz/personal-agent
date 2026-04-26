import { motion, AnimatePresence } from 'motion/react';
import { X, Keyboard } from 'lucide-react';

interface Shortcut {
  keys: string[];
  description: string;
  view?: string;
}

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts: Shortcut[] = [
  { keys: ['Ctrl', 'K'], description: 'Focus document search', view: 'Knowledge Base' },
  { keys: ['Ctrl', 'U'], description: 'Upload document', view: 'Knowledge Base' },
  { keys: ['Ctrl', 'N'], description: 'New decision input', view: 'Decision Maker' },
  { keys: ['Ctrl', 'L'], description: 'Clear conversation', view: 'Decision Maker' },
  { keys: ['?', 'Ctrl', '/'], description: 'Show keyboard shortcuts', view: 'Global' },
];

function KeyBadge({ keys }: { keys: string[] }) {
  return (
    <div className="flex items-center gap-1">
      {keys.map((key, i) => (
        <span key={i} className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 bg-surface-container-high rounded text-xs font-mono text-on-surface border border-outline-variant/50">
          {key}
        </span>
      ))}
    </div>
  );
}

export default function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative bg-surface-container-low rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30">
              <div className="flex items-center gap-3">
                <Keyboard className="w-5 h-5 text-secondary" />
                <h3 className="text-lg font-semibold text-on-surface">Keyboard Shortcuts</h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant hover:text-on-surface"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {shortcuts.map((shortcut, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <KeyBadge keys={shortcut.keys} />
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-on-surface">{shortcut.description}</span>
                        {shortcut.view && (
                          <span className="text-xs px-2 py-0.5 bg-surface-container rounded text-on-surface-variant">
                            {shortcut.view}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-on-surface-variant/60 mt-6 text-center">
                Press ESC or click outside to close
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
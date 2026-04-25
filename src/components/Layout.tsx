import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import KeyboardShortcutsModal from './KeyboardShortcutsModal';
import { motion, AnimatePresence } from 'motion/react';

export default function Layout() {
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Global keyboard shortcut for ? and Ctrl+/
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+/ or ?
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
      } else if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        // Only trigger if not in an input/textarea
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setShowShortcuts((prev) => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-surface text-on-surface flex selection:bg-primary-container selection:text-on-primary-container">
      <Sidebar />
      <main className="flex-1 md:ml-64 relative min-h-screen flex flex-col">
        <TopBar />
        <div className="flex-1 p-6 md:p-12 max-w-[1400px] mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Global Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
    </div>
  );
}

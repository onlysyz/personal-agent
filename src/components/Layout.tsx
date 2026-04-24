import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { motion, AnimatePresence } from 'motion/react';

export default function Layout() {
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
    </div>
  );
}

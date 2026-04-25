import { useState } from 'react';
import { Search, Bell, Settings, Sun, Moon, Keyboard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import LanguageSwitcher from './LanguageSwitcher';
import SettingsModal from './SettingsModal';
import KeyboardShortcutsModal from './KeyboardShortcutsModal';

export default function TopBar() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  return (
    <>
      <header className="hidden md:flex items-center justify-end px-12 w-full sticky top-0 z-30 bg-surface/80 backdrop-blur-md h-20">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <input
              type="text"
              placeholder={t('topbar.searchPlaceholder')}
              className="bg-surface-container-low border border-outline-variant/30 rounded-full py-2 pl-10 pr-4 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-64 transition-all"
            />
            <Search className="absolute left-3 top-2.5 text-on-surface-variant w-4 h-4" />
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />

            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-surface-container transition-colors relative text-on-surface-variant hover:text-on-surface"
              title={theme === 'dark' ? t('topbar.switchToLight') : t('topbar.switchToDark')}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            <button className="p-2 rounded-full hover:bg-surface-container transition-colors relative text-on-surface-variant hover:text-on-surface">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-secondary rounded-full" />
            </button>

            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant hover:text-on-surface"
            >
              <Settings className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowShortcuts(true)}
              className="p-2 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant hover:text-on-surface"
              title="Keyboard shortcuts (?)"
            >
              <Keyboard className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <KeyboardShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </>
  );
}
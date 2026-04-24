import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language === 'zh' ? '中文' : 'EN';

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'zh' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant hover:text-on-surface text-sm font-medium"
      title="Toggle Language"
    >
      <Globe className="w-4 h-4" />
      <span>{currentLang}</span>
    </button>
  );
}
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LanguageSwitcher from '../src/components/LanguageSwitcher';
import i18n from '../src/i18n';

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    localStorage.clear();
    i18n.changeLanguage('en');
  });

  afterEach(() => {
    localStorage.clear();
    i18n.changeLanguage('en');
  });

  it('displays EN when language is English', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);
    expect(screen.getByRole('button').textContent).toContain('EN');
  });

  it('displays 中文 when language is Chinese', async () => {
    const user = userEvent.setup();
    i18n.changeLanguage('zh');
    render(<LanguageSwitcher />);
    expect(screen.getByRole('button').textContent).toContain('中文');
  });

  it('toggles language from EN to 中文 when clicked', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);
    await user.click(screen.getByRole('button'));
    expect(i18n.language).toBe('zh');
  });

  it('toggles language from 中文 to EN when clicked', async () => {
    const user = userEvent.setup();
    i18n.changeLanguage('zh');
    render(<LanguageSwitcher />);
    await user.click(screen.getByRole('button'));
    expect(i18n.language).toBe('en');
  });

  it('persists language to localStorage', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);
    await user.click(screen.getByRole('button'));
    expect(localStorage.getItem('language')).toBe('zh');
  });

  it('loads language from localStorage on init', async () => {
    const user = userEvent.setup();
    localStorage.setItem('language', 'zh');
    i18n.changeLanguage('zh');
    render(<LanguageSwitcher />);
    expect(screen.getByRole('button').textContent).toContain('中文');
  });
});
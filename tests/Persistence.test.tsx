import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import LanguageSwitcher from '../src/components/LanguageSwitcher';
import i18n from '../src/i18n';

function ThemeToggle() {
  const { toggleTheme } = useTheme();
  return <button onClick={toggleTheme} data-testid="theme-toggle">Toggle Theme</button>;
}

function TestApp() {
  const { theme } = useTheme();
  return (
    <div>
      <LanguageSwitcher />
      <ThemeToggle />
      <span data-testid="theme">{theme}</span>
      <span data-testid="lang">{i18n.language}</span>
    </div>
  );
}

describe('Theme + i18n Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    i18n.changeLanguage('en');
  });

  afterEach(() => {
    localStorage.clear();
    i18n.changeLanguage('en');
  });

  it('theme toggle persists to localStorage', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <TestApp />
      </ThemeProvider>
    );

    await act(async () => {
      await user.click(screen.getByTestId('theme-toggle'));
    });

    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('loads theme from localStorage on mount', async () => {
    localStorage.setItem('theme', 'light');

    render(
      <ThemeProvider>
        <TestApp />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme').textContent).toBe('light');
  });

  it('theme toggle works correctly', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <TestApp />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme').textContent).toBe('dark');

    await act(async () => {
      await user.click(screen.getByTestId('theme-toggle'));
    });

    expect(screen.getByTestId('theme').textContent).toBe('light');

    await act(async () => {
      await user.click(screen.getByTestId('theme-toggle'));
    });

    expect(screen.getByTestId('theme').textContent).toBe('dark');
  });
});
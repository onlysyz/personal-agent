import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../src/context/ThemeContext';
import DecisionMakerView from '../src/views/DecisionMakerView';
import PublicProfileView from '../src/views/PublicProfileView';
import i18n from '../src/i18n';

vi.mock('../src/services/api', () => ({
  fetchProfile: vi.fn().mockResolvedValue({
    id: 'AGT-8821',
    name: 'Test User',
    role: 'Engineer',
    location: 'Shanghai',
    email: 'test@example.com',
    github: 'github.com/test',
    avatar: 'https://example.com/avatar.jpg',
    bio: 'Test bio',
    currentFocus: { title: 'Testing', description: 'Testing description', stats: [] },
    skills: [{ name: 'React', value: 0.92, color: 'primary' }],
    experiences: [],
    recentDynamics: [],
    values: ['Innovation'],
    current_goals: 'Test goals',
  }),
  fetchDecisions: vi.fn().mockResolvedValue([]),
  chatWithAgent: vi.fn().mockResolvedValue({
    reply: JSON.stringify({ summary: 'Test', pros: ['Pro 1'], cons: ['Con 1'], alignment: 85 }),
    threadId: 'test-thread',
  }),
}));

describe('DecisionMakerView chat persistence', () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.clearAllMocks();
    await i18n.changeLanguage('en');
  });

  it('loads messages from localStorage on mount', async () => {
    const savedMessages = [{ role: 'user' as const, content: 'Saved message' }];
    localStorage.setItem('decisionMakerMessages', JSON.stringify(savedMessages));

    await act(async () => {
      render(
        <ThemeProvider>
          <DecisionMakerView />
        </ThemeProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Saved message')).toBeInTheDocument();
    });
  });

  it('saves messages to localStorage when changed', async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <DecisionMakerView />
        </ThemeProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Ask follow-up/i)).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/Ask follow-up/i);
    await act(async () => {
      await userEvent.click(textarea);
      await userEvent.paste('Test message');
    });

    await waitFor(() => {
      const saved = localStorage.getItem('decisionMakerMessages');
      expect(saved).toBeTruthy();
    });
  });
});

describe('PublicProfileView chat persistence', () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.clearAllMocks();
    await i18n.changeLanguage('en');
  });

  it('loads chat history from localStorage on mount', async () => {
    const savedHistory = [
      { role: 'model' as const, parts: [{ text: 'Initial message' }] },
      { role: 'user' as const, parts: [{ text: 'User message' }] },
    ];
    localStorage.setItem('publicProfileChatHistory', JSON.stringify(savedHistory));

    await act(async () => {
      render(
        <ThemeProvider>
          <PublicProfileView />
        </ThemeProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Initial message')).toBeInTheDocument();
      expect(screen.getByText('User message')).toBeInTheDocument();
    });
  });

  it('saves chat history to localStorage when changed', async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <PublicProfileView />
        </ThemeProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/query agent/i)).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/query agent/i);
    await act(async () => {
      await userEvent.click(textarea);
      await userEvent.paste('Test query');
    });

    await waitFor(() => {
      const saved = localStorage.getItem('publicProfileChatHistory');
      expect(saved).toBeTruthy();
    });
  });
});
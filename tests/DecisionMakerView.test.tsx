import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../src/context/ThemeContext';
import DecisionMakerView from '../src/views/DecisionMakerView';
import i18n from '../src/i18n';
import { ProfileData, DecisionAnalysis } from '../src/types';

const { mockDecisions, mockProfile } = vi.hoisted(() => {
  const decisions = [
    {
      id: '1',
      question: 'Should I use React or Vue?',
      analysis: { alignment: 85, summary: 'React is better' } as DecisionAnalysis,
    },
    {
      id: '2',
      question: 'Deploy on AWS or GCP?',
      analysis: { alignment: 70, summary: 'AWS is preferred' } as DecisionAnalysis,
    },
  ];

  const profile: ProfileData = {
    id: 'AGT-8821',
    name: 'Test User',
    role: 'Full Stack Engineer',
    location: 'Shanghai',
    email: 'test@example.com',
    github: 'github.com/test',
    avatar: 'https://example.com/avatar.jpg',
    bio: 'Test bio',
    currentFocus: {
      title: 'Testing',
      description: 'Testing description',
      stats: [],
    },
    skills: [
      { name: 'React', value: 0.92, color: 'primary' },
      { name: 'Node.js', value: 0.88, color: 'secondary' },
    ],
    experiences: [],
    recentDynamics: [],
    values: ['Innovation', 'Quality'],
    current_goals: 'Build better products',
  };
  return { mockDecisions: decisions, mockProfile: profile };
});

vi.mock('../src/services/api', () => ({
  fetchProfile: vi.fn().mockResolvedValue(mockProfile),
  fetchDecisions: vi.fn().mockResolvedValue(mockDecisions),
  chatWithAgent: vi.fn().mockResolvedValue({
    reply: JSON.stringify({
      summary: 'Test decision analysis',
      pros: ['Pro 1', 'Pro 2'],
      cons: ['Con 1', 'Con 2'],
      alignment: 85,
    }),
    threadId: 'test-thread',
  }),
}));

function renderDecisionMaker() {
  return render(
    <ThemeProvider>
      <DecisionMakerView />
    </ThemeProvider>
  );
}

describe('DecisionMakerView', () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.clearAllMocks();
    await i18n.changeLanguage('en');
  });

  it('renders header with title', async () => {
    await act(async () => {
      renderDecisionMaker();
    });
    await waitFor(() => {
      expect(screen.getByText('Decision Maker')).toBeInTheDocument();
    });
  });

  it('renders history toggle button', async () => {
    await act(async () => {
      renderDecisionMaker();
    });
    await waitFor(() => {
      expect(document.querySelector('.lucide-history')).toBeInTheDocument();
    });
  });

  it('renders personal context section', async () => {
    await act(async () => {
      renderDecisionMaker();
    });
    await waitFor(() => {
      expect(screen.getAllByText(/personal context/i).length).toBeGreaterThan(0);
    });
  });

  it('renders core values from profile', async () => {
    await act(async () => {
      renderDecisionMaker();
    });
    await waitFor(() => {
      expect(screen.getByText(/core values/i)).toBeInTheDocument();
    });
  });

  it('renders recent decisions section', async () => {
    await act(async () => {
      renderDecisionMaker();
    });
    await waitFor(() => {
      expect(screen.getByText(/recent decisions/i)).toBeInTheDocument();
    });
  });

  it('renders decision items in sidebar', async () => {
    await act(async () => {
      renderDecisionMaker();
    });
    await waitFor(() => {
      expect(screen.getByText('Should I use React or Vue?')).toBeInTheDocument();
    });
  });

  it('renders chat section area', async () => {
    await act(async () => {
      renderDecisionMaker();
    });
    await waitFor(() => {
      // Chat interface should have the main content area
      expect(document.querySelector('.lucide-scale')).toBeInTheDocument();
    });
  });

  it('renders send button', async () => {
    await act(async () => {
      renderDecisionMaker();
    });
    await waitFor(() => {
      expect(document.querySelector('.lucide-send')).toBeInTheDocument();
    });
  });

  it('renders textarea in chat input', async () => {
    await act(async () => {
      renderDecisionMaker();
    });
    await waitFor(() => {
      const textareas = screen.getAllByRole('textbox');
      expect(textareas.length).toBeGreaterThan(0);
    });
  });

  it('displays error state when API fails', async () => {
    const { fetchProfile } = await import('../src/services/api');
    vi.mocked(fetchProfile).mockRejectedValueOnce(new Error('Network error'));

    await act(async () => {
      renderDecisionMaker();
    });

    await waitFor(() => {
      // Error message should appear
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
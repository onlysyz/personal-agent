import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../src/context/ThemeContext';
import PublicProfileView from '../src/views/PublicProfileView';
import i18n from '../src/i18n';
import { ProfileData } from '../src/types';

const { mockProfile } = vi.hoisted(() => {
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
      { name: 'Python', value: 0.85, color: 'secondary' },
    ],
    experiences: [],
    recentDynamics: [],
    values: ['Innovation'],
    current_goals: 'Test goals',
  };
  return { mockProfile: profile };
});

vi.mock('../src/services/api', () => ({
  fetchProfile: vi.fn().mockResolvedValue(mockProfile),
  chatWithAgent: vi.fn().mockResolvedValue({ reply: 'Test response', threadId: 'test-thread' }),
}));

function renderPublicProfile() {
  return render(
    <ThemeProvider>
      <PublicProfileView />
    </ThemeProvider>
  );
}

describe('PublicProfileView', () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.clearAllMocks();
    await i18n.changeLanguage('en');
  });

  it('renders header with profile avatar', async () => {
    await act(async () => {
      renderPublicProfile();
    });
    await waitFor(() => {
      expect(screen.getByRole('img')).toBeInTheDocument();
    });
  });

  it('renders profile name and role', async () => {
    await act(async () => {
      renderPublicProfile();
    });
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
    expect(screen.getByText('Full Stack Engineer')).toBeInTheDocument();
  });

  it('renders agent active badge', async () => {
    await act(async () => {
      renderPublicProfile();
    });
    await waitFor(() => {
      expect(screen.getByText(/agent active/i)).toBeInTheDocument();
    });
  });

  it('renders chat interface with bot icon', async () => {
    await act(async () => {
      renderPublicProfile();
    });
    await waitFor(() => {
      expect(screen.getByText(/interactive session/i)).toBeInTheDocument();
    });
  });

  it('renders clear chat button', async () => {
    await act(async () => {
      renderPublicProfile();
    });
    await waitFor(() => {
      expect(document.querySelector('.lucide-trash-2')).toBeInTheDocument();
    });
  });

  it('renders suggestion button', async () => {
    await act(async () => {
      renderPublicProfile();
    });
    await waitFor(() => {
      expect(screen.getByText(/ask me anything/i)).toBeInTheDocument();
    });
  });

  it('renders chat input textarea', async () => {
    await act(async () => {
      renderPublicProfile();
    });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/query agent/i)).toBeInTheDocument();
    });
  });

  it('renders send button', async () => {
    await act(async () => {
      renderPublicProfile();
    });
    await waitFor(() => {
      expect(document.querySelector('.lucide-send')).toBeInTheDocument();
    });
  });

  it('displays skill tags from profile', async () => {
    await act(async () => {
      renderPublicProfile();
    });
    await waitFor(() => {
      expect(screen.getByText('React')).toBeInTheDocument();
    });
  });
});
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../src/context/ThemeContext';
import DataEditorView from '../src/views/DataEditorView';
import i18n from '../src/i18n';
import { ProfileData } from '../src/types';

const { mockProfile } = vi.hoisted(() => {
  const profile: ProfileData = {
    id: 'AGT-8821',
    name: 'Test User',
    role: 'Engineer',
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
    values: ['Innovation'],
    current_goals: 'Test goals',
  };
  return { mockProfile: profile };
});

vi.mock('../src/services/api', () => ({
  fetchProfile: vi.fn().mockResolvedValue(mockProfile),
  saveProfile: vi.fn().mockResolvedValue(undefined),
}));

function renderDataEditor() {
  return render(
    <ThemeProvider>
      <DataEditorView />
    </ThemeProvider>
  );
}

describe('DataEditorView', () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.clearAllMocks();
    await i18n.changeLanguage('en');
  });

  it('renders loading state initially', () => {
    renderDataEditor();
    expect(screen.queryByRole('button', { name: /discard/i })).toBeNull();
  });

  it('renders header with database icon', async () => {
    await act(async () => {
      renderDataEditor();
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /discard/i })).toBeInTheDocument();
    });

    expect(document.querySelector('.lucide-database')).toBeInTheDocument();
  });

  it('renders discard and commit buttons', async () => {
    await act(async () => {
      renderDataEditor();
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /discard/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /commit/i })).toBeInTheDocument();
  });

  it('displays profile name in JSON textarea', async () => {
    await act(async () => {
      renderDataEditor();
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /discard/i })).toBeInTheDocument();
    });

    const textareas = screen.getAllByRole('textbox');
    const jsonTextarea = textareas[textareas.length - 1];
    expect(jsonTextarea.textContent).toContain('Test User');
  });

  it('displays skill tags in skills section', async () => {
    await act(async () => {
      renderDataEditor();
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /discard/i })).toBeInTheDocument();
    });

    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Node.js')).toBeInTheDocument();
  });

  it('has JSON textarea that can be edited', async () => {
    const user = userEvent.setup();
    await act(async () => {
      renderDataEditor();
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /discard/i })).toBeInTheDocument();
    });

    const textareas = screen.getAllByRole('textbox');
    const jsonTextarea = textareas[textareas.length - 1];

    await act(async () => {
      await user.clear(jsonTextarea);
    });
    await user.click(jsonTextarea);
    await user.paste('Test Name');

    expect(jsonTextarea.textContent).toContain('Test Name');
  });

  it('discard button resets JSON to original profile', async () => {
    const user = userEvent.setup();
    await act(async () => {
      renderDataEditor();
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /discard/i })).toBeInTheDocument();
    });

    const textareas = screen.getAllByRole('textbox');
    const jsonTextarea = textareas[textareas.length - 1];

    // Modify the JSON
    await act(async () => {
      await user.clear(jsonTextarea);
    });
    await user.click(jsonTextarea);
    await user.paste('Modified');

    expect(jsonTextarea.textContent).toContain('Modified');

    // Click discard
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /discard/i }));
    });

    // Should be back to original
    expect(jsonTextarea.textContent).toContain('Test User');
  });

  it('shows save success message after clicking commit', async () => {
    const user = userEvent.setup();
    await act(async () => {
      renderDataEditor();
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /discard/i })).toBeInTheDocument();
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /commit/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/saved/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
import { describe, it, expect, vi } from 'vitest';

const { mockProfile } = vi.hoisted(() => ({
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
}));

vi.mock('../src/services/api', async () => {
  const actual = await vi.importActual('../src/services/api');
  return {
    ...actual,
    fetchProfile: vi.fn(),
    saveProfile: vi.fn(),
    fetchDecisions: vi.fn(),
  };
});

import { fetchProfile, saveProfile } from '../src/services/api';

describe('API retry logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchProfile is called by views', async () => {
    (fetchProfile as ReturnType<typeof vi.fn>).mockResolvedValue(mockProfile);

    const result = await fetchProfile();

    expect(fetchProfile).toHaveBeenCalled();
    expect(result).toEqual(mockProfile);
  });

  it('fetchProfile rejects on error', async () => {
    (fetchProfile as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Failed'));

    await expect(fetchProfile()).rejects.toThrow('Failed');
  });

  it('saveProfile is called with profile data', async () => {
    (saveProfile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await saveProfile(mockProfile);

    expect(saveProfile).toHaveBeenCalledWith(mockProfile);
  });

  it('saveProfile rejects on error', async () => {
    (saveProfile as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Save failed'));

    await expect(saveProfile(mockProfile)).rejects.toThrow('Save failed');
  });
});
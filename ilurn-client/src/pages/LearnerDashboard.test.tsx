import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LearnerDashboard } from './LearnerDashboard';
import { useUserStore } from '../lib/store';

const navigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

describe('LearnerDashboard', () => {
  beforeEach(() => {
    navigate.mockReset();
    useUserStore.setState({
      user_id: 7,
      registration_id: 'ID-ABC1234',
      age_group: 'PUPIL',
      session_id: null,
      name: 'Alex',
      email: 'alex@example.com',
      role: 'LEARNER',
      isAuthenticated: true,
    });
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url === '/users/7/progress') {
        return Promise.resolve({ ok: true, json: async () => ({ progress: [] }) });
      }
      if (url === '/sessions/start') {
        return Promise.resolve({ ok: true, json: async () => ({ session_id: 12, started_at: '2026-06-10T00:00:00' }) });
      }
      return Promise.reject(new Error(`Unexpected URL ${url}`));
    }));
  });

  it('starts a word-reading session through the canonical session route', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LearnerDashboard />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /word reading/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/sessions/start', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ user_id: 7, assessment_type: 'word-reading' }),
    })));
    expect(useUserStore.getState().session_id).toBe(12);
    expect(navigate).toHaveBeenCalledWith('/assessment/word-reading');
  });
});

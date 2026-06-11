import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Register } from './Register';
import { useUserStore } from '../lib/store';

const navigate = vi.fn();
const learnerPassword = 'learner-pass-123';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

describe('Register', () => {
  beforeEach(() => {
    navigate.mockReset();
    useUserStore.getState().logout();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        user: {
          user_id: 7,
          name: 'Alex',
          email: 'alex@example.com',
          role: 'LEARNER',
          registration_id: 'ID-ABC1234',
          age_group: 'PUPIL',
        },
        redirect_to: '/dashboard/learner',
      }),
    }));
  });

  it('signs up a learner and redirects to the learner dashboard', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/your name/i), 'Alex');
    await user.type(screen.getByLabelText(/^email$/i), 'alex@example.com');
    await user.type(screen.getByLabelText(/^password$/i), learnerPassword);
    await user.type(screen.getByLabelText(/date of birth/i), '2016-06-10');
    await user.type(screen.getByLabelText(/parent email/i), 'parent@example.com');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/auth/signup', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({
        name: 'Alex',
        email: 'alex@example.com',
        password: learnerPassword,
        role: 'LEARNER',
        dob: '2016-06-10',
        parent_email: 'parent@example.com',
      }),
    })));
    expect(useUserStore.getState().role).toBe('LEARNER');
    expect(useUserStore.getState().age_group).toBe('PUPIL');
    expect(navigate).toHaveBeenCalledWith('/dashboard/learner');
  });
});

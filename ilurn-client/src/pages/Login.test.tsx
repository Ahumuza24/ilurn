import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Login } from './Login';
import { useUserStore } from '../lib/store';

const navigate = vi.fn();
const adminPassword = 'admin-pass-123';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

describe('Login', () => {
  beforeEach(() => {
    navigate.mockReset();
    useUserStore.getState().logout();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        user: {
          user_id: 2,
          name: 'Admin',
          email: 'admin@example.com',
          role: 'ADMIN',
          registration_id: null,
          age_group: null,
        },
        redirect_to: '/dashboard/admin',
      }),
    }));
  });

  it('logs in and redirects by role', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/^email$/i), 'admin@example.com');
    await user.type(screen.getByLabelText(/^password$/i), adminPassword);
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/auth/login', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ email: 'admin@example.com', password: adminPassword }),
    })));
    expect(useUserStore.getState().role).toBe('ADMIN');
    expect(navigate).toHaveBeenCalledWith('/dashboard/admin');
  });
});

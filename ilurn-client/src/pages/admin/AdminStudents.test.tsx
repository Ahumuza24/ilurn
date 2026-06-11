import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminStudents } from './AdminStudents';

describe('AdminStudents', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url === '/admin/students') {
        return Promise.resolve({ ok: true, json: async () => ({ students: [] }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }));
  });

  it('loads learner records for an authenticated admin', async () => {
    render(
      <MemoryRouter>
        <AdminStudents />
      </MemoryRouter>
    );

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/admin/students', { credentials: 'include' }));
    expect(screen.getByRole('heading', { name: /all learners/i })).toBeInTheDocument();
  });

  it('posts a new student with name and date of birth', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AdminStudents />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /add student/i }));
    await user.type(screen.getByLabelText(/full name/i), 'Jamie Doe');
    await user.type(screen.getByLabelText(/date of birth/i), '2018-05-04');
    await user.click(screen.getByRole('button', { name: /add learner/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/admin/students', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: expect.stringContaining('"name":"Jamie Doe"'),
    })));
  });
});

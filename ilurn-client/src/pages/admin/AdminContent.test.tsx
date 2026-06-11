import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminContent } from './AdminContent';

describe('AdminContent', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (typeof url === 'string' && url.startsWith('/admin/assessment-items?')) {
        return Promise.resolve({
          ok: true,
          json: async () => ([{
            id: 99,
            assessment_type: 'word-reading',
            item_type: 'letter',
            text: 'A',
            sentence: null,
            difficulty: 'letter',
            sort_order: 0,
            active: true,
          }]),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }));
  });

  it('posts new CMS assessment items', async () => {
    const user = userEvent.setup();
    render(<AdminContent />);

    await user.clear(screen.getByLabelText(/prompt text/i));
    await user.type(screen.getByLabelText(/prompt text/i), 'Z');
    await user.clear(screen.getByLabelText(/difficulty/i));
    await user.type(screen.getByLabelText(/difficulty/i), 'letter');
    await user.click(screen.getByRole('button', { name: /add item/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/admin/assessment-items', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: expect.stringContaining('"text":"Z"'),
    })));
  });
});

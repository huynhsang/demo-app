import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, createComment, fetchIssue } from './api';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('comment API', () => {
  it('posts a comment and returns the typed server record', async () => {
    const comment = {
      id: 4,
      issue_id: 2,
      author: 'Alex',
      body: 'Update',
      created_at: '2026-08-14T04:00:00.000Z',
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(comment), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(createComment(2, { author: 'Alex', body: 'Update' })).resolves.toEqual(comment);
    expect(fetchMock).toHaveBeenCalledWith('/api/issues/2/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author: 'Alex', body: 'Update' }),
    });
  });

  it('uses the API error message for failed comment creation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'author and body are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );

    await expect(createComment(2, { author: '', body: '' })).rejects.toMatchObject({
      message: 'author and body are required',
      status: 400,
    });
  });

  it('uses a generic fallback when an error response is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('broken gateway', { status: 502 })));

    await expect(createComment(2, { author: 'Alex', body: 'Update' })).rejects.toThrow(
      'Failed to create comment'
    );
  });

  it('retains the issue response status for not-found handling', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );

    const error = await fetchIssue(999).catch((caught) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, message: 'not found' });
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createIssue } from './api';

describe('createIssue', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the supplied idempotency key', async () => {
    const issue = { id: 42 };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(issue),
    });
    vi.stubGlobal('fetch', fetchMock);

    const input = {
      title: 'Duplicate report',
      description: 'Details',
      priority: 'high' as const,
      assignee: 'Alex',
    };

    await expect(createIssue(input, 'issue-key-1')).resolves.toBe(issue);
    expect(fetchMock).toHaveBeenCalledWith('/api/issues', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'issue-key-1',
      },
      body: JSON.stringify(input),
    });
  });
});

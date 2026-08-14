import type { Comment, Issue, IssueDetail, Priority } from './types';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function responseError(response: Response, fallback: string): Promise<ApiError> {
  let message = fallback;
  try {
    const data = (await response.json()) as { error?: unknown };
    if (typeof data.error === 'string' && data.error.trim()) {
      message = data.error;
    }
  } catch {
    // Keep the actionable operation-specific fallback for non-JSON responses.
  }
  return new ApiError(message, response.status);
}

export async function fetchIssues(params: {
  status?: string;
  assignee?: string;
  search?: string;
}): Promise<Issue[]> {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.assignee) query.set('assignee', params.assignee);
  if (params.search) query.set('search', params.search);

  const res = await fetch(`/api/issues?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to load issues');
  return res.json();
}

export async function fetchIssue(id: string | number): Promise<IssueDetail> {
  const res = await fetch(`/api/issues/${id}`);
  if (!res.ok) throw await responseError(res, 'Failed to load issue');
  return res.json();
}

export async function createIssue(input: {
  title: string;
  description: string;
  priority: Priority;
  assignee: string;
}): Promise<Issue> {
  const res = await fetch('/api/issues', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Failed to create issue');
  return res.json();
}

export async function updateIssue(
  id: number | string,
  input: Partial<Pick<Issue, 'title' | 'description' | 'status' | 'assignee' | 'priority'>>
): Promise<Issue> {
  const res = await fetch(`/api/issues/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Failed to update issue');
  return res.json();
}

export async function createComment(
  issueId: number | string,
  input: Pick<Comment, 'author' | 'body'>
): Promise<Comment> {
  const res = await fetch(`/api/issues/${issueId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await responseError(res, 'Failed to create comment');
  return res.json();
}

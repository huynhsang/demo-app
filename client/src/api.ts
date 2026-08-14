import type { Issue, Priority } from './types';

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

export async function fetchIssue(id: string | number, signal?: AbortSignal): Promise<Issue> {
  const res = await fetch(`/api/issues/${id}`, { signal });
  if (!res.ok) throw new Error('Failed to load issue');
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

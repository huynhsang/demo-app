import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Comment, IssueDetail } from '../types';
import { CURRENT_USER } from '../constants';
import { formatDateTime } from '../utils';
import { ApiError, createComment, fetchIssue, updateIssue } from '../api';
import IssueDetailPage from './IssueDetail';

vi.mock('../api', () => ({
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      public readonly status: number
    ) {
      super(message);
    }
  },
  fetchIssue: vi.fn(),
  updateIssue: vi.fn(),
  createComment: vi.fn(),
}));

const firstComment: Comment = {
  id: 1,
  issue_id: 1,
  author: 'Sam',
  body: 'First update',
  created_at: '2026-08-13T02:00:00.000Z',
};
const secondComment: Comment = {
  id: 2,
  issue_id: 1,
  author: 'Priya',
  body: 'Second update',
  created_at: '2026-08-14T03:00:00.000Z',
};
const issue: IssueDetail = {
  id: 1,
  title: 'Checkout failure',
  description: 'Details',
  status: 'open',
  priority: 'high',
  assignee: 'Priya',
  created_at: '2026-08-12T01:00:00.000Z',
  updated_at: '2026-08-12T01:00:00.000Z',
  comments: [firstComment, secondComment],
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/issues/1']}>
      <Routes>
        <Route path="/issues/:id" element={<IssueDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.mocked(fetchIssue).mockResolvedValue(structuredClone(issue));
  vi.mocked(updateIssue).mockImplementation(async (_id, input) => ({ ...issue, ...input }));
  vi.mocked(createComment).mockReset();
});

describe('IssueDetail comments', () => {
  it('renders loaded comments with author, body, and formatted time in supplied order', async () => {
    renderPage();

    const list = await screen.findByRole('list', { name: 'Issue comments' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Sam');
    expect(items[0]).toHaveTextContent('First update');
    expect(items[0]).toHaveTextContent(formatDateTime(firstComment.created_at));
    expect(items[1]).toHaveTextContent('Priya');
    expect(items[1]).toHaveTextContent('Second update');
  });

  it('renders an empty state and defaults the author to CURRENT_USER', async () => {
    vi.mocked(fetchIssue).mockResolvedValue({ ...issue, comments: [] });
    renderPage();

    expect(await screen.findByText('No comments yet.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Author' })).toHaveValue(CURRENT_USER);
  });

  it('shows local validation errors without calling the API', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { name: 'Checkout failure' });

    await user.clear(screen.getByRole('textbox', { name: 'Author' }));
    await user.click(screen.getByRole('button', { name: 'Add comment' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Author and comment are required.');
    expect(createComment).not.toHaveBeenCalled();
  });

  it('prevents duplicate submission, appends success, and clears only the body', async () => {
    const user = userEvent.setup();
    let resolveComment!: (comment: Comment) => void;
    vi.mocked(createComment).mockReturnValue(
      new Promise<Comment>((resolve) => {
        resolveComment = resolve;
      })
    );
    renderPage();
    await screen.findByRole('heading', { name: 'Checkout failure' });

    const body = screen.getByRole('textbox', { name: 'Comment' });
    const submit = screen.getByRole('button', { name: 'Add comment' });
    await user.type(body, '  New detail  ');
    await user.click(submit);
    await user.click(submit);

    expect(createComment).toHaveBeenCalledTimes(1);
    expect(createComment).toHaveBeenCalledWith('1', {
      author: CURRENT_USER,
      body: 'New detail',
    });
    expect(submit).toBeDisabled();

    resolveComment({
      id: 3,
      issue_id: 1,
      author: CURRENT_USER,
      body: 'New detail',
      created_at: '2026-08-14T04:00:00.000Z',
    });

    expect(await screen.findByText('New detail')).toBeInTheDocument();
    await waitFor(() => expect(body).toHaveValue(''));
    expect(screen.getByRole('textbox', { name: 'Author' })).toHaveValue(CURRENT_USER);
    expect(submit).toBeEnabled();
  });

  it('retains form input and shows the API error after a failed submission', async () => {
    const user = userEvent.setup();
    vi.mocked(createComment).mockRejectedValue(new ApiError('Failed to save comment', 500));
    renderPage();
    await screen.findByRole('heading', { name: 'Checkout failure' });

    const body = screen.getByRole('textbox', { name: 'Comment' });
    await user.type(body, 'Keep this text');
    await user.click(screen.getByRole('button', { name: 'Add comment' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to save comment');
    expect(body).toHaveValue('Keep this text');
  });

  it('distinguishes unknown issues from generic load failures', async () => {
    vi.mocked(fetchIssue).mockRejectedValueOnce(new ApiError('not found', 404));
    const firstRender = renderPage();
    expect(await screen.findByText('Issue not found.')).toBeInTheDocument();
    firstRender.unmount();

    vi.mocked(fetchIssue).mockRejectedValueOnce(new ApiError('Service unavailable', 503));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Service unavailable');
  });

  it('preserves comments while applying existing inline issue updates', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('First update');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'closed');

    await waitFor(() =>
      expect(updateIssue).toHaveBeenCalledWith('1', {
        status: 'closed',
      })
    );
    expect(screen.getByText('First update')).toBeInTheDocument();
  });
});

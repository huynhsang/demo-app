import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Issue, IssueDetail as IssueDetailType, Priority, Status } from '../types';
import { ApiError, createComment, fetchIssue, updateIssue } from '../api';
import { CURRENT_USER } from '../constants';
import { avatarColor, initials, formatDateTime, statusLabel } from '../utils';

const STATUSES: Status[] = ['open', 'in_progress', 'closed'];
const PRIORITIES: Priority[] = ['low', 'medium', 'high'];

export default function IssueDetail() {
  const { id } = useParams();
  const [issue, setIssue] = useState<IssueDetailType | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [assigneeDraft, setAssigneeDraft] = useState('');
  const [commentAuthor, setCommentAuthor] = useState(CURRENT_USER);
  const [commentBody, setCommentBody] = useState('');
  const [commentError, setCommentError] = useState('');
  const [commentPending, setCommentPending] = useState(false);

  useEffect(() => {
    if (!id) return;
    setIssue(null);
    setNotFound(false);
    setLoadError('');
    setCommentError('');
    fetchIssue(id)
      .then((data) => {
        setIssue(data);
        setAssigneeDraft(data.assignee);
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 404) {
          setNotFound(true);
          return;
        }
        setLoadError(error instanceof Error ? error.message : 'Failed to load issue');
      });
  }, [id]);

  async function patch(input: Partial<Pick<Issue, 'status' | 'priority' | 'assignee'>>) {
    if (!id) return;
    const updated = await updateIssue(id, input);
    setIssue((current) => (current ? { ...current, ...updated } : current));
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id || commentPending) return;

    const author = commentAuthor.trim();
    const body = commentBody.trim();
    if (!author || !body) {
      setCommentError('Author and comment are required.');
      return;
    }

    setCommentPending(true);
    setCommentError('');
    try {
      const created = await createComment(id, { author, body });
      setIssue((current) => {
        if (!current) return current;
        const comments = [...current.comments, created].sort(
          (left, right) =>
            left.created_at.localeCompare(right.created_at) || left.id - right.id
        );
        return { ...current, comments };
      });
      setCommentBody('');
    } catch (error) {
      setCommentError(error instanceof Error ? error.message : 'Failed to create comment');
    } finally {
      setCommentPending(false);
    }
  }

  const numericId = Number(id);

  return (
    <div className="page page-narrow">
      <div className="detail-nav">
        <Link to="/" className="back-link">
          ← Back to issues
        </Link>
        <div className="adjacent-links">
          <Link to={`/issues/${numericId - 1}`} className="btn btn-ghost">
            ‹ Previous
          </Link>
          <Link to={`/issues/${numericId + 1}`} className="btn btn-ghost">
            Next ›
          </Link>
        </div>
      </div>

      {notFound && <div className="empty-state">Issue not found.</div>}

      {loadError && (
        <div className="empty-state error-state" role="alert">
          {loadError}
        </div>
      )}

      {!notFound && !loadError && !issue && <div className="empty-state">Loading…</div>}

      {!notFound && !loadError && issue && (
        <>
          <div className="card detail-card">
            <div className="detail-header">
              <span className={`status-dot status-${issue.status}`} />
              <h1>{issue.title}</h1>
            </div>

            <p className="detail-description">{issue.description || 'No description provided.'}</p>

            <div className="detail-meta">
              <label className="field">
                <span>Status</span>
                <select
                  value={issue.status}
                  onChange={(e) => patch({ status: e.target.value as Status })}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {statusLabel(s)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Priority</span>
                <select
                  value={issue.priority}
                  onChange={(e) => patch({ priority: e.target.value as Priority })}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Assignee</span>
                <div className="assignee-edit">
                  <div
                    className="avatar avatar-sm"
                    style={{ background: avatarColor(issue.assignee) }}
                  >
                    {initials(issue.assignee)}
                  </div>
                  <input
                    value={assigneeDraft}
                    onChange={(e) => setAssigneeDraft(e.target.value)}
                    onBlur={() =>
                      assigneeDraft.trim() && patch({ assignee: assigneeDraft.trim() })
                    }
                  />
                </div>
              </label>
            </div>

            <div className="detail-timestamps">
              <span>Created {formatDateTime(issue.created_at)}</span>
              <span>Updated {formatDateTime(issue.updated_at)}</span>
            </div>
          </div>

          <section className="card comments-card" aria-labelledby="comments-heading">
            <h2 id="comments-heading">Comments</h2>

            {issue.comments.length === 0 ? (
              <p className="comments-empty">No comments yet.</p>
            ) : (
              <ul className="comment-list" aria-label="Issue comments">
                {issue.comments.map((comment) => (
                  <li className="comment" key={comment.id}>
                    <div
                      className="avatar avatar-sm"
                      style={{ background: avatarColor(comment.author) }}
                      aria-hidden="true"
                    >
                      {initials(comment.author)}
                    </div>
                    <div className="comment-content">
                      <div className="comment-meta">
                        <strong>{comment.author}</strong>
                        <time dateTime={comment.created_at}>
                          {formatDateTime(comment.created_at)}
                        </time>
                      </div>
                      <p>{comment.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <form className="comment-form" onSubmit={submitComment} noValidate>
              <label className="field">
                <span>Author</span>
                <input
                  value={commentAuthor}
                  onChange={(event) => setCommentAuthor(event.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>Comment</span>
                <textarea
                  value={commentBody}
                  onChange={(event) => setCommentBody(event.target.value)}
                  required
                />
              </label>
              {commentError && (
                <div className="form-error" role="alert">
                  {commentError}
                </div>
              )}
              <div className="form-actions">
                <button className="btn btn-primary" type="submit" disabled={commentPending}>
                  {commentPending ? 'Adding…' : 'Add comment'}
                </button>
              </div>
            </form>
          </section>
        </>
      )}
    </div>
  );
}

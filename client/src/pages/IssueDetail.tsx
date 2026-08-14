import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Issue, Priority, Status } from '../types';
import { fetchIssue, updateIssue } from '../api';
import { avatarColor, initials, formatDateTime, statusLabel } from '../utils';
import { startIssueLoad } from './issueLoadLifecycle';

const STATUSES: Status[] = ['open', 'in_progress', 'closed'];
const PRIORITIES: Priority[] = ['low', 'medium', 'high'];

export default function IssueDetail() {
  const { id } = useParams();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [assigneeDraft, setAssigneeDraft] = useState('');

  useEffect(() => {
    if (!id) return;
    return startIssueLoad({
      id,
      fetchIssue,
      onReset: () => {
        setIssue(null);
        setNotFound(false);
      },
      onIssue: setIssue,
      onAssigneeDraft: setAssigneeDraft,
      onNotFound: () => setNotFound(true),
    });
  }, [id]);

  async function patch(input: Partial<Pick<Issue, 'status' | 'priority' | 'assignee'>>) {
    if (!id) return;
    const updated = await updateIssue(id, input);
    setIssue(updated);
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

      {!notFound && !issue && <div className="empty-state">Loading…</div>}

      {!notFound && issue && (
        <div className="card detail-card">
          <div className="detail-header">
            <span className={`status-dot status-${issue.status}`} />
            <h1>{issue.title}</h1>
          </div>

          <p className="detail-description">{issue.description || 'No description provided.'}</p>

          <div className="detail-meta">
            <label className="field">
              <span>Status</span>
              <select value={issue.status} onChange={(e) => patch({ status: e.target.value as Status })}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Priority</span>
              <select value={issue.priority} onChange={(e) => patch({ priority: e.target.value as Priority })}>
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
                <div className="avatar avatar-sm" style={{ background: avatarColor(issue.assignee) }}>
                  {initials(issue.assignee)}
                </div>
                <input
                  value={assigneeDraft}
                  onChange={(e) => setAssigneeDraft(e.target.value)}
                  onBlur={() => assigneeDraft.trim() && patch({ assignee: assigneeDraft.trim() })}
                />
              </div>
            </label>
          </div>

          <div className="detail-timestamps">
            <span>Created {formatDateTime(issue.created_at)}</span>
            <span>Updated {formatDateTime(issue.updated_at)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

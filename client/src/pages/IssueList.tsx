import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Issue } from '../types';
import { fetchIssues } from '../api';
import { avatarColor, initials, statusLabel } from '../utils';
import { CURRENT_USER } from '../constants';

const STATUSES = ['all', 'open', 'in_progress', 'closed'] as const;

export default function IssueList() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [status, setStatus] = useState(() => localStorage.getItem('statusFilter') || 'all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [assignedToMe, setAssignedToMe] = useState(false);

  async function refresh(nextStatus: string, nextSearch: string) {
    setLoading(true);
    try {
      const data = await fetchIssues({
        status: nextStatus === 'all' ? undefined : nextStatus,
        search: nextSearch || undefined,
      });
      setIssues(data);
    } finally {
      setLoading(false);
    }
  }

  async function loadMine() {
    setLoading(true);
    try {
      const all = await fetchIssues({});
      setIssues(all.filter((i) => i.assignee.toLowerCase() === CURRENT_USER.toLowerCase()));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchIssues({}).then(setIssues).finally(() => setLoading(false));
  }, []);

  function onStatusChange(next: string) {
    setStatus(next);
    localStorage.setItem('statusFilter', next);
    refresh(next, search);
  }

  function onSearch(next: string) {
    setSearch(next);
    refresh(status, next);
  }

  function onToggleMine() {
    const next = !assignedToMe;
    setAssignedToMe(next);
    if (next) {
      loadMine();
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Issues</h1>
        <p className="page-subtitle">Everything currently in the queue.</p>
      </div>

      <div className="filters">
        <div className="segmented">
          {STATUSES.map((s) => (
            <button
              key={s}
              className={`segment ${status === s ? 'active' : ''}`}
              onClick={() => onStatusChange(s)}
              type="button"
            >
              {s === 'all' ? 'All' : statusLabel(s)}
            </button>
          ))}
        </div>
        <input
          className="search-input"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search titles…"
        />
        <button
          type="button"
          className={`segment ${assignedToMe ? 'active' : ''}`}
          onClick={onToggleMine}
        >
          Assigned to me
        </button>
      </div>

      <div className="card list-card">
        {loading && <div className="empty-state">Loading…</div>}

        {!loading && issues.length === 0 && (
          <div className="empty-state">No issues match your filters.</div>
        )}

        {!loading &&
          issues.map((issue) => (
            <Link to={`/issues/${issue.id}`} className="issue-row" key={issue.id}>
              <span className={`status-dot status-${issue.status}`} />
              <div className="issue-row-main">
                <div className="issue-row-title">{issue.title}</div>
                <div className="issue-row-desc">{issue.description}</div>
              </div>
              <span className={`badge priority-${issue.priority}`}>{issue.priority}</span>
              <div
                className="avatar avatar-sm"
                style={{ background: avatarColor(issue.assignee) }}
                title={issue.assignee}
              >
                {initials(issue.assignee)}
              </div>
            </Link>
          ))}
      </div>
    </div>
  );
}

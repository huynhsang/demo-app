import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Issue } from '../types';
import { fetchIssues, bulkCloseIssues } from '../api';
import { avatarColor, initials, statusLabel } from '../utils';

const STATUSES = ['all', 'open', 'in_progress', 'closed'] as const;

export default function IssueList() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [status, setStatus] = useState(() => localStorage.getItem('statusFilter') || 'all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [closing, setClosing] = useState(false);

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

  function onToggleOne(id: number) {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  }

  function onToggleSelectAll() {
    const allSelected = issues.length > 0 && issues.every((i) => selected.has(i.id));
    const next = new Set(selected);
    if (allSelected) {
      issues.forEach((i) => next.delete(i.id));
    } else {
      issues.forEach((i) => next.add(i.id));
    }
    setSelected(next);
  }

  async function onBulkClose() {
    setClosing(true);
    try {
      await bulkCloseIssues(Array.from(selected));
      await refresh(status, search);
    } finally {
      setClosing(false);
    }
  }

  const allVisibleSelected = issues.length > 0 && issues.every((i) => selected.has(i.id));

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
      </div>

      <div className="bulk-bar">
        <label className="bulk-select-all">
          <input type="checkbox" checked={allVisibleSelected} onChange={onToggleSelectAll} />
          Select all
        </label>
        {selected.size > 0 && (
          <button type="button" className="btn btn-primary" onClick={onBulkClose} disabled={closing}>
            {closing ? 'Closing…' : `Close ${selected.size} issue${selected.size === 1 ? '' : 's'}`}
          </button>
        )}
      </div>

      <div className="card list-card">
        {loading && <div className="empty-state">Loading…</div>}

        {!loading && issues.length === 0 && (
          <div className="empty-state">No issues match your filters.</div>
        )}

        {!loading &&
          issues.map((issue) => (
            <div className="issue-row" key={issue.id}>
              <input
                type="checkbox"
                checked={selected.has(issue.id)}
                onChange={() => onToggleOne(issue.id)}
              />
              <Link to={`/issues/${issue.id}`} className="issue-row-link">
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
            </div>
          ))}
      </div>
    </div>
  );
}

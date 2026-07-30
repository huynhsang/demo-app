import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import type { Priority } from '../types';
import { createIssue } from '../api';
import { CURRENT_USER } from '../constants';

const PRIORITIES: Priority[] = ['low', 'medium', 'high'];

export default function NewIssue() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [assignee, setAssignee] = useState(CURRENT_USER);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const created = await createIssue({ title, description, priority, assignee });
    navigate(`/issues/${created.id}`);
  }

  return (
    <div className="page page-narrow">
      <div className="page-header">
        <h1>New issue</h1>
        <p className="page-subtitle">File something into the queue.</p>
      </div>

      <form className="card form-card" onSubmit={onSubmit}>
        <label className="field">
          <span>Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short summary" required />
        </label>

        <label className="field">
          <span>Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's going on, and who reported it?"
          />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Priority</span>
            <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Assignee</span>
            <input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Assignee" />
          </label>
        </div>

        <div className="form-actions">
          <Link to="/" className="btn btn-ghost">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary">
            Create issue
          </button>
        </div>
      </form>
    </div>
  );
}

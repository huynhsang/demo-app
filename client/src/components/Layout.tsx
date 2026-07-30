import { Link, Outlet, useLocation } from 'react-router-dom';
import { CURRENT_USER } from '../constants';
import { avatarColor, initials } from '../utils';

export default function Layout() {
  const location = useLocation();

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark">S</span>
          Support Inbox
        </Link>

        <div className="topbar-actions">
          {location.pathname !== '/issues/new' && (
            <Link to="/issues/new" className="btn btn-primary">
              New issue
            </Link>
          )}
          <div className="avatar" style={{ background: avatarColor(CURRENT_USER) }} title={CURRENT_USER}>
            {initials(CURRENT_USER)}
          </div>
        </div>
      </header>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

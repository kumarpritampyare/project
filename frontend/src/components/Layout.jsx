import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">◆</span>
          <div>
            <strong>TaskFlow</strong>
            <small>Team Task Manager</small>
          </div>
        </div>
        <nav>
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/projects">Projects</NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip">
            <span className="avatar">{user.name.charAt(0)}</span>
            <div>
              <strong>{user.name}</strong>
              <small>{user.email}</small>
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .dashboard()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data) return <div className="loading-screen">Loading dashboard...</div>;

  const { summary, overdue_tasks, recent_tasks } = data;
  const stats = summary.tasks;

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Overview of your projects and tasks</p>
        </div>
        <Link to="/projects" className="btn btn-primary">
          View projects
        </Link>
      </header>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Projects</span>
          <strong className="stat-value">{summary.projects}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total tasks</span>
          <strong className="stat-value">{stats.total}</strong>
        </div>
        <div className="stat-card stat-warning">
          <span className="stat-label">Overdue</span>
          <strong className="stat-value">{stats.overdue}</strong>
        </div>
        <div className="stat-card stat-accent">
          <span className="stat-label">My open tasks</span>
          <strong className="stat-value">{summary.my_open_tasks}</strong>
        </div>
      </div>

      <div className="status-pills">
        <span className="pill pill-todo">To Do: {stats.todo}</span>
        <span className="pill pill-progress">In Progress: {stats.in_progress}</span>
        <span className="pill pill-done">Done: {stats.done}</span>
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <h2>Overdue tasks</h2>
          {overdue_tasks.length === 0 ? (
            <p className="muted empty-state">No overdue tasks — great work!</p>
          ) : (
            <ul className="task-list">
              {overdue_tasks.map((t) => (
                <li key={t.id}>
                  <Link to={`/projects/${t.project_id}`}>
                    <strong>{t.title}</strong>
                    <small>
                      {t.project_name} · due {t.due_date}
                    </small>
                  </Link>
                  <StatusBadge status={t.status} overdue />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <h2>Recent activity</h2>
          {recent_tasks.length === 0 ? (
            <p className="muted empty-state">No tasks yet</p>
          ) : (
            <ul className="task-list">
              {recent_tasks.map((t) => (
                <li key={t.id}>
                  <Link to={`/projects/${t.project_id}`}>
                    <strong>{t.title}</strong>
                    <small>
                      {t.project_name}
                      {t.assignee_name ? ` · ${t.assignee_name}` : ''}
                    </small>
                  </Link>
                  <StatusBadge status={t.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

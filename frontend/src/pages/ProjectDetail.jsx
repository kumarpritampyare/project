import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

const STATUSES = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('tasks');

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assigneeId: '',
    dueDate: '',
    status: 'todo',
  });
  const [memberEmail, setMemberEmail] = useState('');

  const isAdmin = project?.role === 'admin';

  const load = useCallback(() => {
    Promise.all([
      api.project(id),
      api.members(id),
      api.tasks(id),
    ])
      .then(([p, m, t]) => {
        setProject(p.project);
        setMembers(m.members);
        setTasks(t.tasks);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  useEffect(load, [load]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.createTask(id, {
        title: taskForm.title,
        description: taskForm.description || undefined,
        assigneeId: taskForm.assigneeId ? Number(taskForm.assigneeId) : undefined,
        dueDate: taskForm.dueDate || undefined,
        status: taskForm.status,
      });
      setTaskForm({ title: '', description: '', assigneeId: '', dueDate: '', status: 'todo' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateTask = async (taskId, updates) => {
    setError('');
    try {
      await api.updateTask(taskId, updates);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.deleteTask(taskId);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.addMember(id, { email: memberEmail, role: 'member' });
      setMemberEmail('');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await api.updateMemberRole(id, userId, role);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove this member?')) return;
    try {
      await api.removeMember(id, userId);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!project) return <div className="loading-screen">Loading project...</div>;

  return (
    <div>
      <Link to="/projects" className="back-link">
        ← Projects
      </Link>
      <header className="page-header">
        <div>
          <h1>{project.name}</h1>
          {project.description && <p className="muted">{project.description}</p>}
        </div>
        <span className={`role-tag role-${project.role}`}>{project.role}</span>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="tabs">
        <button
          type="button"
          className={tab === 'tasks' ? 'active' : ''}
          onClick={() => setTab('tasks')}
        >
          Tasks ({tasks.length})
        </button>
        <button
          type="button"
          className={tab === 'team' ? 'active' : ''}
          onClick={() => setTab('team')}
        >
          Team ({members.length})
        </button>
      </div>

      {tab === 'tasks' && (
        <>
          <form className="panel task-form" onSubmit={handleCreateTask}>
            <h2>New task</h2>
            <div className="form-row">
              <label>
                Title
                <input
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  required
                />
              </label>
              <label>
                Assign to
                <select
                  value={taskForm.assigneeId}
                  onChange={(e) => setTaskForm({ ...taskForm, assigneeId: e.target.value })}
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Due date
                <input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                />
              </label>
            </div>
            <label>
              Description
              <textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                rows={2}
              />
            </label>
            <button type="submit" className="btn btn-primary">
              Add task
            </button>
          </form>

          <div className="task-board">
            {tasks.map((t) => (
              <div key={t.id} className={`task-row${t.is_overdue ? ' task-overdue' : ''}`}>
                <div className="task-main">
                  <strong>{t.title}</strong>
                  {t.description && <p className="muted">{t.description}</p>}
                  <small>
                    {t.assignee_name ? `Assigned: ${t.assignee_name}` : 'Unassigned'}
                    {t.due_date ? ` · Due ${t.due_date}` : ''}
                  </small>
                </div>
                <div className="task-actions">
                  <StatusBadge status={t.status} overdue={t.is_overdue} />
                  <select
                    value={t.status}
                    onChange={(e) =>
                      handleUpdateTask(t.id, { status: e.target.value })
                    }
                  >
                    {STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  {(isAdmin || t.created_by === user.id) && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleDeleteTask(t.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
            {tasks.length === 0 && (
              <p className="muted empty-state">No tasks in this project yet.</p>
            )}
          </div>
        </>
      )}

      {tab === 'team' && (
        <>
          {isAdmin && (
            <form className="panel form-inline" onSubmit={handleAddMember}>
              <label>
                Add member by email
                <input
                  type="email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                />
              </label>
              <button type="submit" className="btn btn-primary">
                Invite
              </button>
            </form>
          )}
          <ul className="member-list">
            {members.map((m) => (
              <li key={m.id}>
                <div>
                  <strong>{m.name}</strong>
                  <small>{m.email}</small>
                </div>
                {isAdmin ? (
                  <div className="member-actions">
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.id, e.target.value)}
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                    </select>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleRemoveMember(m.id)}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <span className={`role-tag role-${m.role}`}>{m.role}</span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

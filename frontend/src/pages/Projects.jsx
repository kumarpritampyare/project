import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    api
      .projects()
      .then(({ projects }) => setProjects(projects))
      .catch((e) => setError(e.message));
  };

  useEffect(load, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.createProject({ name, description });
      setName('');
      setDescription('');
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Projects</h1>
          <p className="muted">Manage teams and track progress</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'New project'}
        </button>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <form className="panel form-inline" onSubmit={handleCreate}>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Description
            <input value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Creating...' : 'Create'}
          </button>
        </form>
      )}

      <div className="project-grid">
        {projects.map((p) => (
          <Link key={p.id} to={`/projects/${p.id}`} className="project-card">
            <div className="project-card-top">
              <h3>{p.name}</h3>
              <span className={`role-tag role-${p.role}`}>{p.role}</span>
            </div>
            {p.description && <p className="muted">{p.description}</p>}
            <div className="project-meta">
              <span>{p.open_tasks} open</span>
              <span>{p.task_count} total tasks</span>
            </div>
          </Link>
        ))}
        {projects.length === 0 && (
          <p className="muted empty-state">No projects yet. Create your first one!</p>
        )}
      </div>
    </div>
  );
}

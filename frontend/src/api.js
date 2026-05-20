const API = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      data.error ||
      data.errors?.[0]?.msg ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export const api = {
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),
  dashboard: () => request('/dashboard'),
  projects: () => request('/projects'),
  createProject: (body) => request('/projects', { method: 'POST', body: JSON.stringify(body) }),
  project: (id) => request(`/projects/${id}`),
  updateProject: (id, body) =>
    request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
  members: (projectId) => request(`/projects/${projectId}/members`),
  addMember: (projectId, body) =>
    request(`/projects/${projectId}/members`, { method: 'POST', body: JSON.stringify(body) }),
  updateMemberRole: (projectId, userId, role) =>
    request(`/projects/${projectId}/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
  removeMember: (projectId, userId) =>
    request(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' }),
  tasks: (projectId, params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/projects/${projectId}/tasks${q ? `?${q}` : ''}`);
  },
  createTask: (projectId, body) =>
    request(`/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(body) }),
  updateTask: (taskId, body) =>
    request(`/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteTask: (taskId) => request(`/tasks/${taskId}`, { method: 'DELETE' }),
};

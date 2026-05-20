import db from '../db.js';

export function getMembership(projectId, userId) {
  return db
    .prepare(
      `SELECT role FROM project_members WHERE project_id = ? AND user_id = ?`
    )
    .get(projectId, userId);
}

export function requireProjectAccess(req, res, next) {
  const projectId = Number(req.params.projectId || req.params.id);
  const membership = getMembership(projectId, req.user.id);

  if (!membership) {
    return res.status(403).json({ error: 'You are not a member of this project' });
  }

  req.membership = membership;
  req.projectId = projectId;
  next();
}

export function requireAdmin(req, res, next) {
  if (req.membership?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

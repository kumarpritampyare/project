import { Router } from 'express';
import { body, param } from 'express-validator';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { requireProjectAccess, requireAdmin } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get(
  '/',
  param('projectId').isInt({ min: 1 }),
  validate,
  requireProjectAccess,
  (req, res) => {
    const members = db
      .prepare(
        `SELECT u.id, u.name, u.email, pm.role, pm.joined_at
         FROM project_members pm
         INNER JOIN users u ON u.id = pm.user_id
         WHERE pm.project_id = ?
         ORDER BY pm.role DESC, u.name ASC`
      )
      .all(req.projectId);
    res.json({ members });
  }
);

router.post(
  '/',
  [
    param('projectId').isInt({ min: 1 }),
    body('email').isEmail().normalizeEmail(),
    body('role').optional().isIn(['admin', 'member']),
  ],
  validate,
  requireProjectAccess,
  requireAdmin,
  (req, res) => {
    const { email, role = 'member' } = req.body;
    const user = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found. They must register first.' });
    }

    const existing = db
      .prepare('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?')
      .get(req.projectId, user.id);
    if (existing) {
      return res.status(409).json({ error: 'User is already a project member' });
    }

    db.prepare(
      'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)'
    ).run(req.projectId, user.id, role);

    res.status(201).json({
      member: { ...user, role, joined_at: new Date().toISOString() },
    });
  }
);

router.patch(
  '/:userId',
  [
    param('projectId').isInt({ min: 1 }),
    param('userId').isInt({ min: 1 }),
    body('role').isIn(['admin', 'member']),
  ],
  validate,
  requireProjectAccess,
  requireAdmin,
  (req, res) => {
    const userId = Number(req.params.userId);
    const project = db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(req.projectId);

    if (userId === project.owner_id && req.body.role !== 'admin') {
      return res.status(400).json({ error: 'Project owner must remain an admin' });
    }

    const result = db
      .prepare(
        'UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?'
      )
      .run(req.body.role, req.projectId, userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const member = db
      .prepare(
        `SELECT u.id, u.name, u.email, pm.role, pm.joined_at
         FROM project_members pm
         INNER JOIN users u ON u.id = pm.user_id
         WHERE pm.project_id = ? AND pm.user_id = ?`
      )
      .get(req.projectId, userId);

    res.json({ member });
  }
);

router.delete(
  '/:userId',
  param('projectId').isInt({ min: 1 }),
  param('userId').isInt({ min: 1 }),
  validate,
  requireProjectAccess,
  requireAdmin,
  (req, res) => {
    const userId = Number(req.params.userId);
    const project = db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(req.projectId);

    if (userId === project.owner_id) {
      return res.status(400).json({ error: 'Cannot remove the project owner' });
    }

    const result = db
      .prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?')
      .run(req.projectId, userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json({ message: 'Member removed' });
  }
);

export default router;

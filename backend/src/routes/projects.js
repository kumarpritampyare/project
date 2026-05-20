import { Router } from 'express';
import { body, param } from 'express-validator';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';
import {
  requireProjectAccess,
  requireAdmin,
  getMembership,
} from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(authenticate);

router.get('/', (req, res) => {
  const projects = db
    .prepare(
      `SELECT p.id, p.name, p.description, p.owner_id, p.created_at,
              pm.role,
              (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) AS task_count,
              (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status != 'done') AS open_tasks
       FROM projects p
       INNER JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
       ORDER BY p.created_at DESC`
    )
    .all(req.user.id);
  res.json({ projects });
});

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Project name is required'),
    body('description').optional().trim(),
  ],
  validate,
  (req, res) => {
    const { name, description } = req.body;
    const insert = db.prepare(
      'INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)'
    );
    const addMember = db.prepare(
      'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)'
    );

    const tx = db.transaction(() => {
      const result = insert.run(name, description || null, req.user.id);
      const projectId = result.lastInsertRowid;
      addMember.run(projectId, req.user.id, 'admin');
      return projectId;
    });

    const projectId = tx();
    const project = db
      .prepare(
        `SELECT p.*, 'admin' AS role FROM projects p WHERE p.id = ?`
      )
      .get(projectId);
    res.status(201).json({ project });
  }
);

router.get(
  '/:id',
  param('id').isInt({ min: 1 }),
  validate,
  requireProjectAccess,
  (req, res) => {
    const project = db
      .prepare(
        `SELECT p.id, p.name, p.description, p.owner_id, p.created_at, pm.role
         FROM projects p
         INNER JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
         WHERE p.id = ?`
      )
      .get(req.user.id, req.projectId);
    res.json({ project });
  }
);

router.put(
  '/:id',
  [
    param('id').isInt({ min: 1 }),
    body('name').optional().trim().notEmpty(),
    body('description').optional().trim(),
  ],
  validate,
  requireProjectAccess,
  requireAdmin,
  (req, res) => {
    const { name, description } = req.body;
    const current = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.projectId);
    if (!current) return res.status(404).json({ error: 'Project not found' });

    db.prepare(
      'UPDATE projects SET name = ?, description = ? WHERE id = ?'
    ).run(
      name ?? current.name,
      description !== undefined ? description : current.description,
      req.projectId
    );

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.projectId);
    project.role = 'admin';
    res.json({ project });
  }
);

router.delete(
  '/:id',
  param('id').isInt({ min: 1 }),
  validate,
  requireProjectAccess,
  requireAdmin,
  (req, res) => {
    db.prepare('DELETE FROM projects WHERE id = ?').run(req.projectId);
    res.json({ message: 'Project deleted' });
  }
);

export default router;

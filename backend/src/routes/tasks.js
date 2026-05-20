import { Router } from 'express';
import { body, param, query } from 'express-validator';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { requireProjectAccess, getMembership } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';

const router = Router({ mergeParams: true });

const TASK_STATUSES = ['todo', 'in_progress', 'done'];

function taskSelect() {
  return `SELECT t.*,
          assignee.name AS assignee_name,
          creator.name AS created_by_name
   FROM tasks t
   LEFT JOIN users assignee ON assignee.id = t.assignee_id
   LEFT JOIN users creator ON creator.id = t.created_by`;
}

function isOverdue(dueDate, status) {
  if (!dueDate || status === 'done') return false;
  return dueDate < new Date().toISOString().slice(0, 10);
}

router.use(authenticate);

router.get(
  '/',
  [
    param('projectId').isInt({ min: 1 }),
    query('status').optional().isIn(TASK_STATUSES),
    query('assigneeId').optional().isInt({ min: 1 }),
  ],
  validate,
  requireProjectAccess,
  (req, res) => {
    let sql = `${taskSelect()} WHERE t.project_id = ?`;
    const params = [req.projectId];

    if (req.query.status) {
      sql += ' AND t.status = ?';
      params.push(req.query.status);
    }
    if (req.query.assigneeId) {
      sql += ' AND t.assignee_id = ?';
      params.push(Number(req.query.assigneeId));
    }

    sql += ' ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC';

    const tasks = db.prepare(sql).all(...params).map(enrichTask);
    res.json({ tasks });
  }
);

router.post(
  '/',
  [
    param('projectId').isInt({ min: 1 }),
    body('title').trim().notEmpty(),
    body('description').optional().trim(),
    body('status').optional().isIn(TASK_STATUSES),
    body('assigneeId').optional({ nullable: true }).isInt({ min: 1 }),
    body('dueDate').optional({ nullable: true }).isISO8601().toDate(),
  ],
  validate,
  requireProjectAccess,
  (req, res) => {
    const { title, description, status = 'todo', assigneeId, dueDate } = req.body;

    if (assigneeId) {
      const member = db
        .prepare('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?')
        .get(req.projectId, assigneeId);
      if (!member) {
        return res.status(400).json({ error: 'Assignee must be a project member' });
      }
    }

    const result = db
      .prepare(
        `INSERT INTO tasks (project_id, title, description, status, assignee_id, due_date, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        req.projectId,
        title,
        description || null,
        status,
        assigneeId || null,
        dueDate ? dueDate.toISOString().slice(0, 10) : null,
        req.user.id
      );

    const task = db.prepare(`${taskSelect()} WHERE t.id = ?`).get(result.lastInsertRowid);
    res.status(201).json({ task: enrichTask(task) });
  }
);

const taskRouter = Router();
taskRouter.use(authenticate);

taskRouter.get('/:taskId', param('taskId').isInt({ min: 1 }), validate, (req, res) => {
  const task = db.prepare(`${taskSelect()} WHERE t.id = ?`).get(req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const membership = getMembership(task.project_id, req.user.id);
  if (!membership) return res.status(403).json({ error: 'Access denied' });

  res.json({ task: enrichTask(task) });
});

taskRouter.patch(
  '/:taskId',
  [
    param('taskId').isInt({ min: 1 }),
    body('title').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('status').optional().isIn(TASK_STATUSES),
    body('assigneeId').optional({ nullable: true }).isInt({ min: 1 }),
    body('dueDate').optional({ nullable: true }).isISO8601().toDate(),
  ],
  validate,
  (req, res) => {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const membership = getMembership(task.project_id, req.user.id);
    if (!membership) return res.status(403).json({ error: 'Access denied' });

    const { title, description, status, assigneeId, dueDate } = req.body;

    if (assigneeId) {
      const member = db
        .prepare('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?')
        .get(task.project_id, assigneeId);
      if (!member) {
        return res.status(400).json({ error: 'Assignee must be a project member' });
      }
    }

    db.prepare(
      `UPDATE tasks SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        status = COALESCE(?, status),
        assignee_id = COALESCE(?, assignee_id),
        due_date = COALESCE(?, due_date),
        updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      title ?? null,
      description !== undefined ? description : null,
      status ?? null,
      assigneeId !== undefined ? assigneeId : task.assignee_id,
      dueDate !== undefined ? (dueDate ? dueDate.toISOString().slice(0, 10) : null) : task.due_date,
      task.id
    );

    const updated = db.prepare(`${taskSelect()} WHERE t.id = ?`).get(task.id);
    res.json({ task: enrichTask(updated) });
  }
);

taskRouter.delete('/:taskId', param('taskId').isInt({ min: 1 }), validate, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const membership = getMembership(task.project_id, req.user.id);
  if (!membership) return res.status(403).json({ error: 'Access denied' });
  if (membership.role !== 'admin' && task.created_by !== req.user.id) {
    return res.status(403).json({ error: 'Only admins or task creators can delete tasks' });
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(task.id);
  res.json({ message: 'Task deleted' });
});

function enrichTask(task) {
  return {
    ...task,
    is_overdue: isOverdue(task.due_date, task.status),
  };
}

export { router, taskRouter };

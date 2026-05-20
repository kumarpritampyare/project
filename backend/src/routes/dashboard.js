import { Router } from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  const stats = db
    .prepare(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN t.status = 'todo' THEN 1 ELSE 0 END) AS todo,
        SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS done,
        SUM(CASE WHEN t.due_date < ? AND t.status != 'done' THEN 1 ELSE 0 END) AS overdue
       FROM tasks t
       INNER JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = ?`
    )
    .get(today, req.user.id);

  const myTasks = db
    .prepare(
      `SELECT COUNT(*) AS count FROM tasks t
       INNER JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = ?
       WHERE t.assignee_id = ? AND t.status != 'done'`
    )
    .get(req.user.id, req.user.id);

  const overdueTasks = db
    .prepare(
      `SELECT t.id, t.title, t.status, t.due_date, t.project_id, p.name AS project_name
       FROM tasks t
       INNER JOIN projects p ON p.id = t.project_id
       INNER JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = ?
       WHERE t.due_date < ? AND t.status != 'done'
       ORDER BY t.due_date ASC
       LIMIT 10`
    )
    .all(req.user.id, today);

  const recentTasks = db
    .prepare(
      `SELECT t.id, t.title, t.status, t.due_date, t.project_id, p.name AS project_name,
              u.name AS assignee_name
       FROM tasks t
       INNER JOIN projects p ON p.id = t.project_id
       INNER JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = ?
       LEFT JOIN users u ON u.id = t.assignee_id
       ORDER BY t.updated_at DESC
       LIMIT 8`
    )
    .all(req.user.id);

  const projectCount = db
    .prepare('SELECT COUNT(*) AS count FROM project_members WHERE user_id = ?')
    .get(req.user.id);

  res.json({
    summary: {
      projects: projectCount.count,
      tasks: stats,
      my_open_tasks: myTasks.count,
    },
    overdue_tasks: overdueTasks,
    recent_tasks: recentTasks,
  });
});

export default router;

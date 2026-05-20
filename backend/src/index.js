import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import './db.js';

import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import memberRoutes from './routes/members.js';
import { router as taskRoutes, taskRouter } from './routes/tasks.js';
import dashboardRoutes from './routes/dashboard.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'team-task-manager-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects/:projectId/members', memberRoutes);
app.use('/api/projects/:projectId/tasks', taskRoutes);
app.use('/api/tasks', taskRouter);
app.use('/api/dashboard', dashboardRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});

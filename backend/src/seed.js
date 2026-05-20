import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import db from './db.js';

dotenv.config();

const users = [
  { name: 'Alice Admin', email: 'alice@example.com', password: 'password123' },
  { name: 'Bob Member', email: 'bob@example.com', password: 'password123' },
  { name: 'Carol Member', email: 'carol@example.com', password: 'password123' },
];

const existing = db.prepare('SELECT COUNT(*) AS c FROM users').get();
if (existing.c > 0) {
  console.log('Database already has data. Skipping seed.');
  process.exit(0);
}

const insertUser = db.prepare(
  'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)'
);

const userIds = users.map((u) => {
  const hash = bcrypt.hashSync(u.password, 10);
  const r = insertUser.run(u.name, u.email, hash);
  return r.lastInsertRowid;
});

const projectId = db
  .prepare('INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)')
  .run('Website Redesign', 'Revamp the company marketing site', userIds[0]).lastInsertRowid;

const addMember = db.prepare(
  'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)'
);
addMember.run(projectId, userIds[0], 'admin');
addMember.run(projectId, userIds[1], 'member');
addMember.run(projectId, userIds[2], 'member');

const insertTask = db.prepare(
  `INSERT INTO tasks (project_id, title, description, status, assignee_id, due_date, created_by)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);

const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 2);
const nextWeek = new Date();
nextWeek.setDate(nextWeek.getDate() + 7);

insertTask.run(
  projectId,
  'Design homepage mockup',
  'Create Figma wireframes',
  'in_progress',
  userIds[1],
  nextWeek.toISOString().slice(0, 10),
  userIds[0]
);
insertTask.run(
  projectId,
  'Set up CI pipeline',
  'GitHub Actions for deploy',
  'todo',
  userIds[2],
  yesterday.toISOString().slice(0, 10),
  userIds[0]
);
insertTask.run(
  projectId,
  'Write API documentation',
  null,
  'done',
  userIds[0],
  null,
  userIds[0]
);

console.log('Seed complete!');
console.log('Demo accounts (password: password123):');
users.forEach((u) => console.log(`  ${u.email}`));

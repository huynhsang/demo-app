import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data.sqlite');

export const initializeDatabase = (database: DatabaseSync) => {
  database.exec(`
    CREATE TABLE IF NOT EXISTS issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      priority TEXT NOT NULL DEFAULT 'medium',
      assignee TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  const { count } = database.prepare('SELECT COUNT(*) as count FROM issues').get() as { count: number };

  if (count === 0) {
    const insert = database.prepare(`
      INSERT INTO issues (title, description, status, priority, assignee, created_at, updated_at)
      VALUES (@title, @description, @status, @priority, @assignee, @created_at, @updated_at)
    `);

    const now = Date.parse('2026-07-30T09:00:00Z');
    const daysAgo = (n: number) => new Date(now - n * 86400000).toISOString();

    const issues = [
      { title: 'Checkout page throws 500 on empty cart', description: 'Reported by three customers this week. Stack trace points at the pricing calculator.', status: 'open', priority: 'high', assignee: 'Priya', created_at: daysAgo(1), updated_at: daysAgo(1) },
      { title: 'Dark mode toggle resets on navigation', description: 'Toggle state is lost whenever the user moves between pages.', status: 'in_progress', priority: 'medium', assignee: 'Alex', created_at: daysAgo(2), updated_at: daysAgo(1) },
      { title: 'Export to CSV missing header row', description: 'Finance team noticed the exported file has no column names.', status: 'open', priority: 'medium', assignee: 'Sam', created_at: daysAgo(3), updated_at: daysAgo(3) },
      { title: 'Slow load on the reports dashboard', description: 'Takes 8+ seconds for accounts with a lot of history.', status: 'open', priority: 'low', assignee: 'Jordan', created_at: daysAgo(4), updated_at: daysAgo(4) },
      { title: 'Typo in password reset email', description: 'Subject line reads "You\'re password" instead of "Your password".', status: 'closed', priority: 'low', assignee: 'Alex', created_at: daysAgo(6), updated_at: daysAgo(5) },
      { title: 'Mobile nav overlaps footer on iOS Safari', description: 'Only reproduces below 380px width.', status: 'open', priority: 'medium', assignee: 'Priya', created_at: daysAgo(5), updated_at: daysAgo(5) },
      { title: 'Add bulk-close action for issues', description: 'Support team wants to close multiple resolved tickets at once.', status: 'open', priority: 'low', assignee: 'Sam', created_at: daysAgo(7), updated_at: daysAgo(7) },
      { title: 'Weekly digest email sent twice on Mondays', description: 'Customers getting the same email twice, an hour apart.', status: 'in_progress', priority: 'medium', assignee: 'Jordan', created_at: daysAgo(2), updated_at: daysAgo(1) },
      { title: 'Assignee dropdown includes former employees', description: 'Should only list current team members.', status: 'open', priority: 'low', assignee: 'Alex', created_at: daysAgo(8), updated_at: daysAgo(8) },
      { title: 'Duplicate "welcome" issue created last sprint', description: 'Looks like the same issue got filed twice by mistake.', status: 'closed', priority: 'low', assignee: 'Priya', created_at: daysAgo(10), updated_at: daysAgo(9) },
    ];

    database.exec('BEGIN');
    for (const row of issues) insert.run(row);
    database.exec('COMMIT');
  }
};

export const createDatabase = (filename = dbPath) => {
  const database = new DatabaseSync(filename);
  initializeDatabase(database);
  return database;
};

export const db = createDatabase();

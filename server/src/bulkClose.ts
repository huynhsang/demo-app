import type { DatabaseSync } from 'node:sqlite';

export class BulkCloseValidationError extends Error {}
export class BulkCloseNotFoundError extends Error {}

export function validateBulkCloseIds(input: unknown): number[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new BulkCloseValidationError('ids must be a non-empty array');
  }

  if (!input.every(Number.isSafeInteger)) {
    throw new BulkCloseValidationError('ids must contain only safe integers');
  }

  const ids = input as number[];
  if (new Set(ids).size !== ids.length) {
    throw new BulkCloseValidationError('ids must not contain duplicates');
  }

  return ids;
}

export function closeIssues(database: DatabaseSync, input: unknown): unknown[] {
  const ids = validateBulkCloseIds(input);
  const placeholders = ids.map(() => '?').join(', ');
  const now = new Date().toISOString();

  database.exec('BEGIN');
  try {
    const existing = database
      .prepare(`SELECT id FROM issues WHERE id IN (${placeholders})`)
      .all(...ids);

    if (existing.length !== ids.length) {
      throw new BulkCloseNotFoundError('one or more issues not found');
    }

    database
      .prepare(`UPDATE issues SET status = ?, updated_at = ? WHERE id IN (${placeholders})`)
      .run('closed', now, ...ids);

    const updated = database
      .prepare(`SELECT * FROM issues WHERE id IN (${placeholders})`)
      .all(...ids);

    database.exec('COMMIT');
    return updated;
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

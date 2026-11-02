import { DataSource, QueryRunner } from 'typeorm';

const POLL_MS = 20;
const MAX_POLLS = 100;

/**
 * Resolves once another connection is waiting on a lock `holder` holds, so a
 * spec can show what a write waits for without guessing how long it takes.
 */
export const waitUntilBlockedBy = async (
  dataSource: DataSource,
  holder: QueryRunner,
): Promise<void> => {
  const [{ pid }] = (await holder.query('SELECT pg_backend_pid() AS pid')) as {
    pid: number;
  }[];

  for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
    const waiting: unknown[] = await dataSource.query(
      'SELECT 1 FROM pg_stat_activity WHERE $1 = ANY(pg_blocking_pids(pid))',
      [pid],
    );
    if (waiting.length > 0) return;
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  throw new Error('The write never waited on the held lock');
};

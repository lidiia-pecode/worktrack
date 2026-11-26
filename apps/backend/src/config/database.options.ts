import { ConfigService } from '@nestjs/config';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

export type ReadEnv = (key: string) => string | undefined;

// Waiting longer for a free connection fails the request instead of hanging it.
const POOL_WAIT_LIMIT_MS = 10_000;

/**
 * The app's validated config as text, the way the migration CLI reads
 * `process.env`: validation turns `DATABASE_SSL` into a boolean and `DB_PORT`
 * into a number, which would otherwise read differently in each.
 */
export const readValidatedConfig =
  (config: ConfigService): ReadEnv =>
  (key) =>
    config.get<string | number | boolean>(key)?.toString();

/**
 * Hosted databases hand out a single connection URL; Docker gives separate
 * DB_* values. Both the app and the migration CLI read this, so they cannot
 * disagree about where the database is.
 */
export function databaseConnectionOptions(env: ReadEnv) {
  const shared = {
    type: 'postgres' as const,
    synchronize: false,
    // Queries are logged while developing; tests and production stay quiet.
    logging: !['production', 'test'].includes(env('NODE_ENV') ?? ''),
    namingStrategy: new SnakeNamingStrategy(),
    ssl: env('DATABASE_SSL') === 'true' ? { rejectUnauthorized: true } : false,
    connectTimeoutMS: POOL_WAIT_LIMIT_MS,
    // A missing value in a find, count or exists would otherwise drop the
    // condition and match any row. Update and delete criteria aren't covered.
    invalidWhereValuesBehavior: {
      null: 'throw' as const,
      undefined: 'throw' as const,
    },
  };

  const url = env('DATABASE_URL');

  if (url) {
    return { ...shared, url };
  }

  return {
    ...shared,
    host: env('DB_HOST'),
    port: Number(env('DB_PORT') ?? 5432),
    username: env('DB_USERNAME'),
    password: env('DB_PASSWORD'),
    database: env('DB_NAME'),
  };
}

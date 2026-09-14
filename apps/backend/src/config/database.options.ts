import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

type ReadEnv = (key: string) => string | undefined;

/**
 * Hosted databases hand out a single connection URL; Docker gives separate
 * DB_* values. Both the app and the migration CLI read this, so they cannot
 * disagree about where the database is.
 */
export function databaseConnectionOptions(env: ReadEnv) {
  const shared = {
    type: 'postgres' as const,
    synchronize: false,
    logging: env('NODE_ENV') !== 'production',
    namingStrategy: new SnakeNamingStrategy(),
    ssl: env('DATABASE_SSL') === 'true' ? { rejectUnauthorized: true } : false,
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

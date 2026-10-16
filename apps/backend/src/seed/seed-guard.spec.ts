import { assertLocalDatabase } from './seed-guard';

const envFrom =
  (values: Record<string, string>) =>
  (key: string): string | undefined =>
    values[key];

describe('assertLocalDatabase', () => {
  it('allows the local Docker database', () => {
    expect(() =>
      assertLocalDatabase(envFrom({ DB_HOST: 'localhost', DB_NAME: 'x' })),
    ).not.toThrow();
  });

  it('allows a local connection URL, as CI uses', () => {
    expect(() =>
      assertLocalDatabase(
        envFrom({ DATABASE_URL: 'postgres://u:p@127.0.0.1:5432/worktrack' }),
      ),
    ).not.toThrow();
    expect(() =>
      assertLocalDatabase(
        envFrom({ DATABASE_URL: 'postgres://u:p@[::1]:5432/worktrack' }),
      ),
    ).not.toThrow();
  });

  it('refuses a hosted database, even when .env points at a local one', () => {
    expect(() =>
      assertLocalDatabase(
        envFrom({
          DB_HOST: 'localhost',
          DATABASE_URL:
            'postgres://u:p@ep-example.eu-central-1.aws.neon.tech/neondb?sslmode=verify-full',
        }),
      ),
    ).toThrow('not "ep-example.eu-central-1.aws.neon.tech"');
  });

  it('refuses an SSL connection, even to a local host', () => {
    expect(() =>
      assertLocalDatabase(
        envFrom({ DB_HOST: 'localhost', DATABASE_SSL: 'true' }),
      ),
    ).toThrow('uses SSL');
  });

  it('refuses production', () => {
    expect(() =>
      assertLocalDatabase(
        envFrom({ DB_HOST: 'localhost', NODE_ENV: 'production' }),
      ),
    ).toThrow('NODE_ENV=production');
  });

  it('refuses when no host is set', () => {
    expect(() => assertLocalDatabase(envFrom({}))).toThrow('no host set');
  });
});

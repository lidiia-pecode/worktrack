import {
  databaseConnectionOptions,
  type ReadEnv,
} from 'src/config/database.options';

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1'];

// URL keeps the brackets around an IPv6 host, such as "[::1]".
const hostOfUrl = (url: string) =>
  new URL(url).hostname.replace(/^\[|\]$/g, '');

/**
 * The seed creates accounts with one shared, published password, so it must
 * never write to a hosted database. It reads the same options the data source
 * connects with, so the check and the connection cannot disagree.
 */
export function assertLocalDatabase(env: ReadEnv): void {
  if (env('NODE_ENV') === 'production') {
    throw new Error('The seed does not run with NODE_ENV=production.');
  }

  const options = databaseConnectionOptions(env);

  if (options.ssl) {
    throw new Error(
      'The seed runs only against a local database, and this connection uses SSL (DATABASE_SSL=true).',
    );
  }

  const host = 'url' in options ? hostOfUrl(options.url) : options.host;

  if (!host || !LOCAL_HOSTS.includes(host)) {
    throw new Error(
      `The seed runs only against a local database, not "${host ?? 'no host set'}".`,
    );
  }
}

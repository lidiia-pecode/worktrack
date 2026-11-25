import { ConfigService } from '@nestjs/config';

import {
  databaseConnectionOptions,
  readValidatedConfig,
} from './database.options';

const URL = 'postgres://user:password@db.example.com:5432/worktrack';

describe('databaseConnectionOptions', () => {
  it('turns TLS on in the app as in the migration CLI', () => {
    // Validation hands the app a boolean; the CLI reads the text.
    const app = databaseConnectionOptions(
      readValidatedConfig(
        new ConfigService({ DATABASE_URL: URL, DATABASE_SSL: true }),
      ),
    );
    const cli = databaseConnectionOptions(
      (key) => ({ DATABASE_URL: URL, DATABASE_SSL: 'true' })[key],
    );

    expect(app.ssl).toEqual({ rejectUnauthorized: true });
    expect(cli.ssl).toEqual(app.ssl);
  });
});

import { ConfigService } from '@nestjs/config';

import {
  databaseConnectionOptions,
  readValidatedConfig,
} from './database.options';
import { envValidationSchema } from './env.validation';

const URL = 'postgres://user:password@db.example.com:5432/worktrack';

describe('databaseConnectionOptions', () => {
  it('turns TLS on in the app as in the migration CLI', () => {
    // Validation hands the app a boolean; the CLI reads the text.
    const validated: unknown = envValidationSchema
      .extract('DATABASE_SSL')
      .validate('true').value;
    const app = databaseConnectionOptions(
      readValidatedConfig(
        new ConfigService({ DATABASE_URL: URL, DATABASE_SSL: validated }),
      ),
    );
    const cli = databaseConnectionOptions(
      (key) => ({ DATABASE_URL: URL, DATABASE_SSL: 'true' })[key],
    );

    expect(app.ssl).toEqual({ rejectUnauthorized: true });
    expect(cli.ssl).toEqual(app.ssl);
  });
});

describe('DATABASE_SSL', () => {
  // The migration CLI and the seed guard turn TLS on only for exactly "true".
  it('refuses true written in another case', () => {
    expect(
      envValidationSchema.extract('DATABASE_SSL').validate('TRUE').error,
    ).toBeDefined();
  });
});

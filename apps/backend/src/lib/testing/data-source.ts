import { DataSource } from 'typeorm';

import { AppDataSource } from 'src/data-source';

/** The app's own connection settings, minus the query logging. */
export const openTestDataSource = (): Promise<DataSource> =>
  new DataSource({ ...AppDataSource.options, logging: false }).initialize();

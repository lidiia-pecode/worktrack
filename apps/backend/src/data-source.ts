import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

import { databaseConnectionOptions } from './config/database.options';

dotenv.config();

export const AppDataSource = new DataSource({
  ...databaseConnectionOptions((key) => process.env[key]),
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  subscribers: [],
});

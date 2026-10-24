import 'reflect-metadata';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline/promises';
import { DataSource } from 'typeorm';

import { databaseConnectionOptions } from 'src/config/database.options';

import { MigrationReview, reviewMigrationSource } from './migration-risk';

/**
 * Runs pending migrations against the hosted database, with the checks that
 * docs/workflow.md ("Database changes", "Deployment") asks for done by the
 * script rather than remembered: the target has to be Neon, the migration
 * files have to be committed, every statement is shown and classed before
 * anything runs, a destructive one needs an explicit flag, and nothing is
 * applied without --apply and the database's name typed back.
 *
 * `npm run migrate:neon` loads apps/backend/.env.neon; `make migrate-neon`
 * turns APPLY, ALLOW_DESTRUCTIVE and ONLY into the flags below.
 */

const MIGRATIONS_DIR = path.resolve(__dirname, '../migrations');
const NEON_HOST_SUFFIX = '.neon.tech';
const MIGRATION_FILE = /^\d+-\w+\.ts$/;
const MIGRATION_NAME = /\bname\s*=\s*'(\w+)'/;

interface Options {
  apply: boolean;
  allowDestructive: boolean;
  /** Part of one migration's name: only it is loaded, the rest stay pending. */
  only?: string;
}

interface MigrationFile {
  name: string;
  file: string;
  source: string;
}

interface PendingMigration extends MigrationFile {
  review: MigrationReview;
}

const fail = (message: string): never => {
  console.error(`\n✖ ${message}`);
  process.exit(1);
};

const parseOptions = (argv: string[]): Options => {
  const options: Options = { apply: false, allowDestructive: false };

  for (const arg of argv) {
    if (arg === '--apply') options.apply = true;
    else if (arg === '--allow-destructive') options.allowDestructive = true;
    else if (arg.startsWith('--only='))
      options.only = arg.slice('--only='.length);
    else
      fail(
        `Unknown argument ${arg}. Use --apply, --allow-destructive, --only=<name>.`,
      );
  }

  if (options.only !== undefined && !/^\w+$/.test(options.only)) {
    fail(
      '--only takes part of a migration class name: letters, digits and underscores.',
    );
  }
  // The database name is typed back before anything runs, so a pipe can't apply.
  if (options.apply && !process.stdin.isTTY) {
    fail('--apply needs an interactive terminal to confirm in.');
  }
  return options;
};

/**
 * Every migration file, with the name its class declares (`name = '…'`): the
 * name the migrations table records, which a file name need not match.
 */
const readMigrationFiles = (): MigrationFile[] =>
  readdirSync(MIGRATIONS_DIR)
    .filter((file) => MIGRATION_FILE.test(file))
    .sort()
    .map((file) => {
      const source = readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      const name = MIGRATION_NAME.exec(source)?.[1];
      if (!name)
        return fail(`${file} declares no \`name\`; every migration has to.`);
      return { name, file, source };
    });

const git = (...args: string[]) =>
  execFileSync('git', args, { cwd: MIGRATIONS_DIR, encoding: 'utf8' }).trim();

/** The hosted database only, over TLS, and never by accident the local one. */
const assertNeonTarget = (): URL => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return fail(
      'DATABASE_URL is not set. Run `npm run migrate:neon`, which loads apps/backend/.env.neon.',
    );
  }

  const parsed = new URL(url);
  if (!parsed.hostname.endsWith(NEON_HOST_SUFFIX)) {
    fail(
      `DATABASE_URL points at ${parsed.hostname}, not a ${NEON_HOST_SUFFIX} host. This script is for the hosted database only.`,
    );
  }
  if (process.env.DATABASE_SSL !== 'true') {
    fail('DATABASE_SSL must be "true" for the hosted database.');
  }

  return parsed;
};

/** Every migration file is committed as is, so what runs is what the branch holds. */
const assertMigrationsCommitted = () => {
  const changes = git('status', '--porcelain', '--', '.');
  if (changes) {
    fail(
      `Migration files differ from the last commit; commit or drop them first:\n${changes}`,
    );
  }
};

const describeRisk = ({ risk, reasons }: MigrationReview) =>
  reasons.length ? `${risk}: ${reasons.join('; ')}` : risk;

const printPending = (pending: PendingMigration[]) => {
  for (const { name, review } of pending) {
    console.log(`\n  [ ] ${name} — ${describeRisk(review)}`);
    for (const statement of review.statements) {
      console.log(`      ${statement}`);
    }
    if (review.statements.length === 0) console.log('      (no SQL in up())');
  }
};

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const target = assertNeonTarget();
  assertMigrationsCommitted();

  const dataSource = new DataSource({
    ...databaseConnectionOptions((key) => process.env[key]),
    logging: ['migration', 'warn', 'error'],
    entities: [],
    migrations: [
      path.join(MIGRATIONS_DIR, options.only ? `*${options.only}*.ts` : '*.ts'),
    ],
  });

  await dataSource.initialize();

  try {
    const [identity] = await dataSource.query<
      { database: string; user: string; version: string }[]
    >(
      'select current_database() as database, current_user as "user", version()',
    );

    console.log(`Target: ${target.hostname}`);
    console.log(
      `        ${identity.database} as ${identity.user} · ${identity.version.split(' on ')[0]}`,
    );

    // A database never migrated has no table yet; any other failure is a real one.
    const hasMigrationsTable = await dataSource.query<{ exists: boolean }[]>(
      `select to_regclass('public.migrations') is not null as "exists"`,
    );
    if (!hasMigrationsTable[0].exists) {
      console.log(
        '        No migrations table yet: this database has never been migrated.',
      );
    }
    const executed = new Set(
      hasMigrationsTable[0].exists
        ? (
            await dataSource.query<{ name: string }[]>(
              'select name from migrations order by id',
            )
          ).map((row) => row.name)
        : [],
    );
    const allPending = readMigrationFiles().filter(
      ({ name }) => !executed.has(name),
    );
    // What the data source loaded is what runMigrations will run.
    const loadedNames = new Set(
      dataSource.migrations.map(
        (migration) => migration.name ?? migration.constructor.name,
      ),
    );
    const pending: PendingMigration[] = allPending
      .filter(({ name }) => loadedNames.has(name))
      .map((migration) => ({
        ...migration,
        review: reviewMigrationSource(migration.source),
      }));
    const heldBack = allPending.filter(
      ({ name }) => !pending.some((migration) => migration.name === name),
    );

    console.log(
      `\n${executed.size} applied, ${allPending.length} pending${
        options.only ? `, ${pending.length} selected by --only` : ''
      }.`,
    );

    if (options.only && pending.length === 0) {
      fail(`No pending migration matches "${options.only}".`);
    }
    // Everything loaded and pending would run, so --only has to come down to one.
    if (options.only && pending.length > 1) {
      fail(
        `"${options.only}" matches ${pending.length} pending migrations; name one: ${pending.map(({ name }) => name).join(', ')}.`,
      );
    }
    if (pending.length === 0) {
      console.log('Nothing to apply.');
      return;
    }

    printPending(pending);
    if (heldBack.length) {
      console.log(
        `\n  Held back by --only, still pending: ${heldBack.map(({ name }) => name).join(', ')}`,
      );
    }

    const destructive = pending.filter(
      ({ review }) => review.risk === 'destructive',
    );
    if (destructive.length && !options.allowDestructive) {
      fail(
        `${destructive.length} of these would break the code Render is running now. ` +
          'Apply it only after the merge, once a route that exists only in the new build answers 401 ' +
          '(docs/workflow.md, "Verifying a production migration"), with --allow-destructive. ' +
          'To apply the additive ones first, name one with --only=<name>.',
      );
    }
    if (destructive.length) {
      console.log(
        '\n  ⚠ Destructive: make sure Render is serving the new code before you continue.',
      );
    }

    if (!options.apply) {
      console.log(
        `\nDry run: nothing applied. Add --apply to run ${pending.length === 1 ? 'this migration' : `these ${pending.length} migrations`}.`,
      );
      return;
    }

    const prompt = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const answer = await prompt.question(
      `\nType the database name "${identity.database}" to apply: `,
    );
    prompt.close();
    if (answer.trim() !== identity.database)
      fail('Names differ. Nothing applied.');

    console.log('');
    const applied = await dataSource.runMigrations({ transaction: 'all' });

    console.log(`\n✔ Applied ${applied.length}:`);
    for (const migration of applied) console.log(`  [X] ${migration.name}`);
    console.log(
      '\nNext: check the schema from information_schema and the deployed app, as docs/workflow.md describes.',
    );
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error('\n✖ Migration failed:', error);
  process.exit(1);
});

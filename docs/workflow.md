# Development workflow

How a change gets from a local branch to `main`. For first-time setup, commands
and environment variables, see the [README](../README.md).

## Branches

`main` is the only long-lived branch. It is protected: direct pushes are
rejected, and everything lands through a pull request.

Branch off `main` for each piece of work, naming the branch after the
Conventional Commit prefix its commits will use:

| Prefix | For |
| :--- | :--- |
| `feat/` | new product capability |
| `fix/` | a defect in shipped behaviour |
| `chore/` | dependencies, config, tooling, cleanup |
| `refactor/` | structural change, no behaviour change |
| `docs/` | documentation only |

One branch does one thing. A branch that cleans up dead code *and* adds an
endpoint cannot be reviewed or reverted as a unit.

## The loop

```bash
git checkout main && git pull
git checkout -b feat/team-week-grid

make dev                              # Postgres in Docker, both apps on the machine
make test                             # backend suite, against the local database
npm run test -w apps/frontend         # frontend suite, no database needed
npm run format:check && npm run lint && npm run typecheck   # repo root, both apps

git push -u origin feat/team-week-grid
gh pr create                          # say what changed and why
```

Then wait for CI, open the preview Vercel comments on the PR and click through
the change, and merge with **Squash and merge** — the only option enabled.
One PR becomes one commit on `main`, which keeps the history readable and makes
`git revert` a single reliable operation.

### Backend tests and the dev database

`make test` runs against the same local database you use in the browser; there
is no separate test database. That is safe because every spec that touches the
database creates its own throwaway company, works only inside it, and deletes it
at the end.

Two specs reach outside their company, each running a real nightly job across
the whole database, which is what the jobs do at 03:00 anyway: the auth
clean-up spec, which deletes expired sessions and used or expired one-time
tokens, and the notifications spec, which deletes notifications read more than
60 days ago.

A run that is interrupted can leave a test company behind. It is invisible to
the seeded users and harmless; `make down-hard && make setup` clears it along
with everything else.

## CI

`.github/workflows/ci.yml` runs on every pull request and on every push to
`main`, as two jobs:

| Check | Runs |
| :--- | :--- |
| **Frontend** | `npm ci` → format check → lint → build → typecheck → test |
| **Backend** | `npm ci` → format check → lint → typecheck → build → migrations → test |

Lint fails on any warning (`--max-warnings=0` in each app's `lint` script), and
the format check is `prettier --check`; `npm run format` in an app fixes it.

Both are required to pass before a PR can merge, along with Vercel's own
**Vercel** check, and a branch has to be up to date with `main` — if `main` moves
while the PR is open, update the branch and the checks run again.

Node comes from `.nvmrc`, and the backend job gets a throwaway Postgres 16
service container. Migrations run against it before the tests, because the tests
use real SQL and need the schema to exist.

CI needs no repository secrets. The suites talk to the database directly and
never boot the Nest application, so none of the application's required
environment variables come into play.

To reproduce a CI failure locally, run the same root scripts; they are the same
commands CI calls.

## Database changes

### What a migration is, and when one appears

A migration is a TypeScript class in `apps/backend/src/migrations/` with an `up`
and a `down`, holding the exact SQL that moves the schema from one shape to the
next. The filename starts with a timestamp, and that timestamp is the order they
run in.

A schema change is never written by hand. Change the entity, then let TypeORM
diff the entities against a live database and write the file:

```bash
make db                         # the diff is taken against the running local database
npm run migration:generate -w apps/backend -- src/migrations/DescriptiveName
npx prettier --write apps/backend/src/migrations/<the new file>.ts
```

Generated files come out with different formatting from the rest of the
repository, so run prettier over the new one before committing. Read the SQL
afterwards — generation is a starting point, not an authority, and it will
happily write a destructive statement you did not intend.

A data-only migration, which changes rows but not the schema, has nothing to
diff, so it is the one kind written by hand: a timestamped class with the
`UPDATE` in `up`. Its `down` restores the old values when it can, and is
deliberately empty, with a comment saying why, when it cannot.

### How TypeORM knows what has already run

A `migrations` table in each database, holding one row per applied migration:

| id | timestamp | name |
| :--- | :--- | :--- |
| 7 | 1789830866330 | AddInvitationTeamAndInviter1789830866330 |
| 8 | 1790004090909 | CreateAbsenceEntity1790004090909 |
| 9 | 1790006851300 | RemoveActivityIsAbsence1790006851300 |

On `migration:run`, TypeORM reads that table, compares it with the migration
files it can find, and runs whatever is in the files but not in the table, in
timestamp order. Two consequences worth internalising:

- **A database is "at" whatever its own `migrations` table says.** Local, CI and
  Neon each keep their own, and they are routinely at different counts. That
  difference is also the quickest proof of which database you are connected to.
- **What it can find is the file list, not the git history.** Migrations are
  discovered by globbing `src/migrations/*` (or `dist/migrations/*` for the
  compiled data source), so a file that is not in that directory does not exist
  as far as a run is concerned. This is what makes it possible to apply only
  some of the pending migrations — see below.

### Checking what is pending

There is **no `migration:show` npm script**; call the binary directly. Against
the local database, from `apps/backend`:

```bash
npx typeorm-ts-node-commonjs migration:show -d src/data-source.ts
```

`[X]` is applied, `[ ]` is pending. Run this before and after every apply,
everywhere. It is the cheapest check in this whole document. Against Neon,
`make migrate-neon` without `APPLY=1` is the same check with the risk of each
pending migration added (see *Running a migration against Neon*).

### The four rules

1. **Migrations run as a separate step, never at application boot.** For now
   that step is run by hand (see *On merge to `main`*). `synchronize` stays
   `false` — two instances racing the same DDL is not a theoretical problem.
2. **A committed migration is immutable.** If it was wrong, write another one.
   Editing one that has already run leaves two databases permanently different.
3. **Additive first.** To rename or drop a column: add the new one and backfill,
   switch the code, then drop the old one in a later change. Deploys are not
   instantaneous, so every intermediate state has to work with both versions of
   the code.
4. **Label destructive migrations in the PR.** `DROP`, `ALTER ... TYPE`, or
   `NOT NULL` on an existing column deserves a second look before merge.

### Additive and destructive migrations are deployed in opposite orders

This is the single thing most likely to break the stand, and rule 3 is the
reason for it.

An **additive** migration — a new table, a nullable column, an index — is
invisible to code that does not know about it. The old code keeps working after
it runs, so it goes **before** the deploy, and the new code finds what it needs
the moment it starts.

A **destructive** migration — `DROP COLUMN`, a narrowed type, a new `NOT NULL` —
breaks the code that is currently running. TypeORM selects every mapped column by
name, so dropping one makes every query against that table fail until the new
code is live. It goes **after** the deploy.

A **data-only** migration changes rows, not columns, so the old code keeps
working and it goes **before** the deploy too. Until the new code is live, the
old code can still write rows the migration would have changed, so check those
afterwards.

| Kind | Examples | Apply |
| :--- | :--- | :--- |
| Additive | `CREATE TABLE`, nullable column, index, new enum type | **Before** the merge |
| Data only | `UPDATE` of existing rows, no schema change | **Before** the merge; then check rows the old code wrote in between |
| Destructive | `DROP COLUMN`, `DROP TABLE`, `NOT NULL` on existing data, type narrowing | **After** Render is serving the new code |

A change that contains both is applied in two sittings, not one.

### Applying only some of the pending migrations

`migration:run` has no "stop at this one" option — it applies every pending
migration it can find. When a branch carries an additive and a destructive
migration together, `make migrate-neon ONLY=<name>` loads just the one named
(a part of its class name that matches exactly one pending migration; it
refuses when several match) and lists the rest as held back, so the additive
one can go before the merge and the destructive one after. TypeORM does not
mind the order, so a held-back migration with an earlier timestamp still runs
later. Against the local database the question never arises: `make migrate`
applies them all.

### Testing a schema change

Twice. `make down-hard && make setup` proves it runs on an empty database, and
`make migrate` against a database that already has data proves it
runs as an upgrade. Only the second catches a `NOT NULL` added to a populated
table. CI covers the first of these on every pull request; the second is yours.

## Deployment

One environment so far: a shared development stand. There is no production yet —
it will be a second copy of the same two services when there is a reason for one.

| Part | Runs on | URL |
| :--- | :--- | :--- |
| Frontend | Vercel, root directory `apps/frontend` | `worktrack-frontend-roan.vercel.app` |
| Backend | Render, one Docker service built from `apps/backend/Dockerfile` | `worktrack-backend-wa4t.onrender.com` |
| Database | Neon, managed Postgres | — |

**The browser never calls the backend directly.** It calls `/api/backend/*` on
the frontend's own domain and a Next rewrite forwards it server-side. That is
what keeps auth cookies on the frontend's domain, and it is why the four Google
callback URLs point at the frontend's proxy path rather than at the backend. It
is also why `BACKEND_URL` must stay out of anything the browser loads.

### On a pull request

Vercel builds a preview of the frontend and comments the URL on the PR. Its
**Vercel** check has to pass alongside `Frontend` and `Backend`. Open the preview
and click through the change — that is the part CI cannot do for you, and it is
what catches things that only break in a production build.

Every preview talks to the same backend, so a PR that changes the backend needs
its branch deployed to Render before its preview means anything.

**A PR that adds a migration is not ready to merge until you have read the
dry run.** Run `make migrate-neon` and check that it lists exactly this PR's
migrations as pending, and nothing left over from an earlier merge, with the
risk you expect. The dry run applies nothing. Applying is a separate step that
follows *On merge to `main`* below: an additive migration before the merge, a
destructive one after Render serves the new code.

Google sign-in from a preview finishes on the main frontend domain rather than
the preview, because the callback URLs are a single fixed value. Everything else
on a preview behaves normally.

### On merge to `main`

Vercel builds and promotes the frontend. Render rebuilds the backend image and
swaps the service over.

**Migrations are not automatic.** Render's pre-deploy command is a paid feature,
so every migration is run from a laptop with `make migrate-neon` (below). That
has to become a real release step before any of this is called production.

**When by hand means depends on the kind of migration**, per the table in
*Database changes*: additive ones go before the merge, destructive ones after
Render has swapped the service over. Getting it backwards breaks the stand in
one of two ways — merging before an additive migration deploys code that reads
columns the database does not have, and applying a destructive one early breaks
the code that is still running.

Nothing rescues either case automatically: `synchronize` is `false`, so the
application never creates or drops anything on its own.

#### Running a migration against Neon

Neon's credentials live in `apps/backend/.env.neon`, which is gitignored and
holds `DATABASE_URL` (ending in `sslmode=verify-full`) and `DATABASE_SSL=true`.
Render has its own copy in its dashboard; the file is for running migrations
from a laptop.

One command does the whole runbook, and does nothing until told to:

```bash
make migrate-neon                                   # dry run: target, pending list, risk of each
make migrate-neon APPLY=1                           # the same, then applies after you type the database name
make migrate-neon APPLY=1 ONLY=AddUserDeactivatedAt # one of several pending; the rest stay held back
make migrate-neon APPLY=1 ALLOW_DESTRUCTIVE=1       # needed for a DROP, RENAME, NOT NULL or type change
```

It is `apps/backend/src/scripts/migrate-neon.ts`, started by `npm run
migrate:neon`, which loads `.env.neon` with Node's `--env-file` so the shell
never sees the connection string (it contains `&`, which `source` would read as
a background operator). It runs from the TypeScript source like the local
`migration:run`, so there is nothing to build first. In order, it:

1. **Checks the target.** `DATABASE_URL` has to name a `.neon.tech` host and
   `DATABASE_SSL` has to be `true`, or it stops before connecting. It then
   prints the host, database, user and server version — Neon is Postgres 18 as
   `worktrack_owner`; local is Postgres 16 as `worktrack`.
2. **Checks the files.** Every migration file has to be committed as it is
   (`git status` clean under `src/migrations/`), because a committed migration
   is immutable and what runs has to be what the branch holds.
3. **Lists what is pending**, reads each pending migration's `up()` and prints
   its statements with a class: *additive* (a new table, nullable column,
   index or enum label; a foreign key's `ON UPDATE` action is part of the
   constraint and doesn't count as an update), *data* (`UPDATE`, `DELETE`,
   `INSERT` — the schema is unchanged, the rows are not), or *destructive*
   (`DROP`, `RENAME`, `ALTER COLUMN … TYPE`, `SET NOT NULL`, `TRUNCATE`). SQL it cannot read as a
   plain string counts as destructive. The rules are `migration-risk.ts`, with
   their tests.
4. **Refuses a destructive migration without `ALLOW_DESTRUCTIVE=1`**, and with
   it reminds you to confirm first that Render is serving the new code (the
   route probe under *Verifying a production migration*).
5. **Stops here unless `APPLY=1`.** With it, you type the database name back
   in the terminal (a piped stdin is refused), and the pending migrations run
   in one transaction. It then lists what was applied and points to the checks
   below.

A dry run is read-only and safe at any time. Reading it before every merge that
carries a migration is required (*On a pull request*); it is also how to check,
before any merge, that nothing from an earlier one is still pending.

#### Verifying a production migration

Before applying, all of these:

- the dry run names Neon and lists exactly the migrations you expect to be
  pending — no more;
- for a destructive migration, **Render is genuinely serving the new code.**
  "Live" in the dashboard is not proof. Probe a route that only exists in the new
  build: a registered route answers `401` behind `AccessGuard`, while a path that
  does not exist answers `404` with `Cannot GET`. That difference is conclusive;
- the migration file on your machine matches what merged —
  `git show origin/main:<path> | diff - <path>` (the script checks it is
  committed, not that it is on `main`).

After applying, all of these:

- a second dry run lists nothing pending;
- the schema itself agrees, read from `information_schema` and `pg_constraint`
  rather than trusted from the `migrations` table — columns, constraints,
  indexes, foreign keys and enum labels;
- row counts on the affected tables are what you expected;
- the deployed application still works: load the screens that touch the changed
  tables and check the network panel for `5xx`, not just that the page renders.

#### Where migrations run, and how those differ

| | Runs | Data source | Applied by |
| :--- | :--- | :--- | :--- |
| **Local** | `make migrate` | `src/data-source.ts` via ts-node | You, whenever you pull a schema change |
| **CI** | every pull request, before the tests | `src/data-source.ts` | `ci.yml`, against a throwaway Postgres |
| **Neon** | `make migrate-neon` from a laptop | the same options as `src/data-source.ts`, via ts-node | You, around the deploy |

CI proves a migration runs on an **empty** database, since its Postgres is
created fresh per job. It says nothing about running as an upgrade over existing
rows — that is what the local populated-database test and the Neon run are for.

#### Who does what

There is one environment and one person deploying to it, so "who" mostly means
"what must not be skipped".

| Step | Done by |
| :--- | :--- |
| Change an entity, generate and read the migration | Whoever writes the feature |
| Label a destructive migration in the PR body | Author, before review |
| Prove it runs on an empty database | CI, on every pull request |
| Prove it runs over existing data | Author, locally, before opening the PR |
| Decide additive-before / destructive-after | Author and reviewer, from the table above |
| Read the dry run before merging a PR that adds a migration | You, with `make migrate-neon` (applies nothing) |
| Run the dry run and apply against Neon | You, with `make migrate-neon`; nothing automates the timing |
| Confirm Render is serving new code before a destructive run | You, with the route probe |
| Verify schema and application after applying | You |
| Deploy the code itself | Vercel and Render, automatically on merge |

#### Runs worth learning from

**Scope D — `AddInvitationTeamAndInviter1789830866330`**, September 2026, the
first migration this project ever deployed. Additive and uneventful: two
nullable columns and two `ON DELETE SET NULL` foreign keys, applied in one
transaction before the merge, with the schema checked against
`information_schema` afterwards rather than trusted from the `migrations` table.
The two pitfalls above — build first, do not `source` the env file — are the
ones actually hit.

**Phase 2 absences — two migrations in one pull request**, and the reason the
additive/destructive split is written down here. `CreateAbsenceEntity` added the
`absences` table; `RemoveActivityIsAbsence` dropped `activities.is_absence`,
which the deployed code still selected. Running both before the merge would have
broken every activities query until the deploy landed.

What was done instead:

1. `CreateAbsenceEntity` applied to Neon **before** merging, with
   `RemoveActivityIsAbsence` held back by moving its compiled files out of
   `dist/migrations/` (what `ONLY=` does today) — `migration:show` confirmed it
   had vanished from the pending list before anything ran.
2. Verified: table, enum, check constraint, index and both foreign keys present;
   `activities.is_absence` still present; the deployed activities API still
   returning `200`.
3. Merged, and waited for Render.
4. Confirmed the new code was actually serving — `GET /absences` answered `401`
   while `/absences-does-not-exist` answered `404`, which only the new build
   does.
5. `RemoveActivityIsAbsence` applied **after** that, then verified: column gone,
   the twelve activity rows intact, and absences created, edited and deleted
   through the deployed UI with no `5xx` anywhere.

**Phase 36 — `AddUserInactivePeriods`, never applied.** It merged (PR #53) without
the migration being run on Neon, so every request that computes expected hours
answered `500` until it was found after the next merge, on 27 October 2026. A
dry run read before that merge would have listed it. That is why reading the
dry run is now required for any PR that adds a migration.

### Environment variables

Set in each host's dashboard. Nothing secret lives in the repository; the
`.env.sample` files are the contract.

Vercel needs one variable, `BACKEND_URL`, scoped to both Production and Preview.
`next.config.ts` reads it at **build** time, so it has to be set before a build,
not only at runtime.

Render needs everything marked required in `apps/backend/.env.sample`, plus
`DATABASE_URL`, `DATABASE_SSL=true`, `NODE_ENV=production` and
`AUTH_COOKIE_SECURE=true`. Its secrets differ from the local ones deliberately: a
token from one environment must not be valid in another.

Neon's URL comes with `sslmode=require`; change it to `sslmode=verify-full`,
here and in `.env.neon`. `pg` treats `require` as a full certificate check today
but will weaken it in pg v9, and warns about it on every connection.

### Rollback

| Broken | Do |
| :--- | :--- |
| Frontend | Vercel → previous deployment → *Promote to Production*. Seconds, no rebuild. |
| Backend | Redeploy the previous commit from the Render dashboard. |
| Both | Roll back both, then `git revert` the squash commit through a PR, so the repository matches what is running. |
| A migration | Do not reach for `migration:revert`. It only helps if it was the last one and nothing has written data since. Default to a forward fix in a new PR. |

### What the free tier costs you

The backend sleeps after 15 minutes idle and takes about a minute to wake, and
the Neon compute suspends after 5. A slow first request after a quiet spell is
normal here, not a fault. Render's dashboard saying "Live" also does not mean new
environment variables are in use, or that the new image is the one answering —
check the running service, not the dashboard. The route probe under *Verifying a
production migration* is how you check.

Vercel's Hobby plan is for non-commercial use, so this arrangement needs paid
plans the day the project becomes real work.

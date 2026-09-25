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

make dev                              # stack up, work as usual
make test                             # backend suite, needs the stack running
npm run test -w apps/frontend         # frontend suite, no stack needed
npm run lint && npm run typecheck     # from the repo root, both apps

git push -u origin feat/team-week-grid
gh pr create                          # the PR template asks for what changed and why
```

Then wait for CI, open the preview Vercel comments on the PR and click through
the change, and merge with **Squash and merge** — the only option enabled.
One PR becomes one commit on `main`, which keeps the history readable and makes
`git revert` a single reliable operation.

## CI

`.github/workflows/ci.yml` runs on every pull request and on every push to
`main`, as two jobs:

| Check | Runs |
| :--- | :--- |
| **Frontend** | `npm ci` → lint → build → typecheck |
| **Backend** | `npm ci` → lint → typecheck → build → migrations → test |

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

You never write one by hand. Change the entity, then let TypeORM diff the
entities against a live database and write the file:

```bash
make up                         # the diff is taken against the running local database
docker-compose -f docker-compose.dev.yml exec backend \
  npm run migration:generate -- src/migrations/DescriptiveName
npx prettier --write apps/backend/src/migrations/<the new file>.ts
```

Generated files come out with different formatting from the rest of the
repository, so run prettier over the new one before committing. Read the SQL
afterwards — generation is a starting point, not an authority, and it will
happily write a destructive statement you did not intend.

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
the local database, inside the container:

```bash
docker-compose -f docker-compose.dev.yml exec backend \
  npx typeorm migration:show -d dist/data-source.js
```

`[X]` is applied, `[ ]` is pending. Run this before and after every apply,
everywhere. It is the cheapest check in this whole document.

### The four rules

1. **Migrations run as a release step, never at application boot.**
   `synchronize` stays `false` — two instances racing the same DDL is not a
   theoretical problem.
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

| Kind | Examples | Apply |
| :--- | :--- | :--- |
| Additive | `CREATE TABLE`, nullable column, index, new enum type | **Before** the merge |
| Destructive | `DROP COLUMN`, `DROP TABLE`, `NOT NULL` on existing data, type narrowing | **After** Render is serving the new code |

A change that contains both is applied in two sittings, not one.

### Applying only some of the pending migrations

`migration:run` has no "stop at this one" option — it applies every pending
migration it can find. When a branch carries an additive and a destructive
migration together, hide the destructive one from the run by moving its
**compiled** files out of the way:

```bash
cd apps/backend && npm run build
mkdir -p /tmp/held
mv dist/migrations/<timestamp>-<DestructiveName>.* /tmp/held/
# migration:show now lists only the additive one as pending
```

Only `dist/` is touched — the source file stays committed, and `npm run build`
afterwards puts it back. Confirm with `migration:show` that the held-back
migration has genuinely disappeared from the list before running anything.

### Testing a schema change

Twice. `make down-hard && make setup` proves it runs on an empty database, and
`make up && make migrate` against a database that already has data proves it
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

Google sign-in from a preview finishes on the main frontend domain rather than
the preview, because the callback URLs are a single fixed value. Everything else
on a preview behaves normally.

### On merge to `main`

Vercel builds and promotes the frontend. Render rebuilds the backend image and
swaps the service over.

**Migrations are not automatic.** Render's pre-deploy command is a paid feature,
so every migration is run by hand against Neon from a laptop. That has to become
a real release step before any of this is called production.

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
holds `DATABASE_URL` and `DATABASE_SSL=true`. Render has its own copy in its
dashboard; the file is for running migrations from a laptop.

Node 22 reads an env file without the shell touching it, which is what these
commands rely on:

```bash
cd apps/backend
npm run build                 # required: the compiled data source is what runs

# 1. which database is this, really?
node --env-file=.env.neon ../../node_modules/.bin/typeorm \
  query "select current_database(), current_user, version()" -d dist/data-source.js

# 2. what is pending?
node --env-file=.env.neon ../../node_modules/.bin/typeorm \
  migration:show -d dist/data-source.js

# 3. apply
node --env-file=.env.neon ../../node_modules/.bin/typeorm \
  migration:run -d dist/data-source.js

# 4. confirm
node --env-file=.env.neon ../../node_modules/.bin/typeorm \
  migration:show -d dist/data-source.js
```

Four things that cost time the first time:

- **Build first.** The run reads `dist/data-source.js`, so a migration added
  since the last build is simply invisible to it.
- **Do not `source .env.neon`.** The connection string contains `&`, so the shell
  parses it as a background operator and the file fails to load. `--env-file`
  avoids this entirely — the value never reaches the shell. (`npm run
  migration:run:prod` is the same command without the env file, so it will talk
  to whatever `.env` points at. Prefer the explicit form above.)
- **`dotenv.config()` does not override.** `data-source.ts` calls it, and it
  leaves existing environment variables alone, so the Neon values win over
  `.env`.
- **Neon is Postgres 18 and the user is `worktrack_owner`**; local is Postgres 16
  as `worktrack`. Step 1 above prints both, so there is no guessing about which
  database is about to be written to.

Step 1 and step 2 together are the pre-flight: the first names the server, the
second proves the state — local and Neon are always at different counts, so a
pending list matching local means the connection went to the wrong place.

#### Verifying a production migration

Before applying, all of these:

- the pre-flight above names Neon, and lists exactly the migrations you expect
  to be pending — no more;
- for a destructive migration, **Render is genuinely serving the new code.**
  "Live" in the dashboard is not proof. Probe a route that only exists in the new
  build: a registered route answers `401` behind `AccessGuard`, while a path that
  does not exist answers `404` with `Cannot GET`. That difference is conclusive;
- the migration file on your machine matches what merged —
  `git show origin/main:<path> | diff - <path>`.

After applying, all of these:

- `migration:show` lists it as `[X]`;
- the schema itself agrees, read from `information_schema` and `pg_constraint`
  rather than trusted from the `migrations` table — columns, constraints,
  indexes, foreign keys and enum labels;
- row counts on the affected tables are what you expected;
- the deployed application still works: load the screens that touch the changed
  tables and check the network panel for `5xx`, not just that the page renders.

#### Where migrations run, and how those differ

| | Runs | Data source | Applied by |
| :--- | :--- | :--- | :--- |
| **Local** | `make migrate`, or `migration:run` in the container | `src/data-source.ts` via ts-node | You, whenever you pull a schema change |
| **CI** | every pull request, before the tests | `src/data-source.ts` | `ci.yml`, against a throwaway Postgres |
| **Neon** | by hand from a laptop | `dist/data-source.js` | You, around the deploy |

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
| Run the pre-flight and apply against Neon | You, from a laptop — nothing automates this |
| Confirm Render is serving new code before a destructive run | You, with the route probe |
| Verify schema and application after applying | You |
| Deploy the code itself | Vercel and Render, automatically on merge |

#### Two runs worth learning from

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
   `dist/migrations/` — `migration:show` confirmed it had vanished from the
   pending list before anything ran.
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

A local footnote worth knowing: after a column is dropped, a *running* dev
backend keeps its old compiled entity and fails with `column ... does not exist`
until the container is restarted. That is staleness, not a broken migration.

One warning surfaced that is worth acting on before a `pg` upgrade: `pg` now
reports that `sslmode=require` is treated as `verify-full`, and that this
changes in pg v9 / pg-connection-string v3. Make the Neon URL say
`sslmode=verify-full` explicitly before then.

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

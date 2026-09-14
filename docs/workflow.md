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
npm run lint && npm run typecheck     # from the repo root, both apps

git push -u origin feat/team-week-grid
gh pr create                          # the PR template asks for what changed and why
```

Then wait for CI, and merge with **Squash and merge** — the only option enabled.
One PR becomes one commit on `main`, which keeps the history readable and makes
`git revert` a single reliable operation.

## CI

`.github/workflows/ci.yml` runs on every pull request and on every push to
`main`, as two jobs:

| Check | Runs |
| :--- | :--- |
| **Frontend** | `npm ci` → lint → build → typecheck |
| **Backend** | `npm ci` → lint → typecheck → build → migrations → test |

Both are required to pass before a PR can merge, and a branch has to be up to
date with `main` — if `main` moves while the PR is open, update the branch and
the checks run again.

Node comes from `.nvmrc`, and the backend job gets a throwaway Postgres 16
service container. Migrations run against it before the tests, because the tests
use real SQL and need the schema to exist.

CI needs no repository secrets. The one test suite talks to the database
directly and never boots the Nest application, so none of the application's
required environment variables come into play.

To reproduce a CI failure locally, run the same root scripts; they are the same
commands CI calls.

## Database changes

Migrations live in `apps/backend/src/migrations/`. `migration:run` runs them from
TypeScript and is what you use locally and in CI; `migration:run:prod` runs the
compiled `dist/data-source.js` and is what a deployed image uses.

Four rules:

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

Test a schema change twice: `make down-hard && make setup` proves it runs on an
empty database, and `make up && make migrate` against a database that already
has data proves it runs as an upgrade. Only the second catches a `NOT NULL`
added to a populated table.

## Deployment

Not set up yet. Nothing is hosted, so `main` is the last step in this workflow
today rather than a trigger for anything.

The plan is Vercel for the frontend with a preview deployment per pull request,
and a single long-running backend service that builds from the Dockerfile and
runs `migration:run:prod` as its pre-deploy step. When that exists, this section
gains the preview URL step and a rollback procedure.

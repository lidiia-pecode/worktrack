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
so a migration is run by hand against Neon before the code that needs it merges.
That has to become a real release step before any of this is called production.

That hand-run has not been done yet. Connecting from a laptop is proven —
`migration:show` against Neon lists all six migrations as applied, so the
connection string, TLS and the TypeORM setup all work — but `migration:run:prod`
has never applied anything there, because nothing has been pending. The first
real schema change is what verifies it: release it in the order above, with the
compiled `dist/data-source.js`, and note anything this section gets wrong. Do
not write a migration just to rehearse with.

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
environment variables are in use — check the running service, not the dashboard.

Vercel's Hobby plan is for non-commercial use, so this arrangement needs paid
plans the day the project becomes real work.

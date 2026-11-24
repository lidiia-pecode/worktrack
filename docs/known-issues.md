# WorkTrack — Known issues

What is wrong, unfinished or deliberately left out, grouped by the part of the
product it belongs to. Each entry says what happens, who meets it and the fix
that is known. What the product does today is in
[`business_architecture_docs.md`](./business_architecture_docs.md).

Each entry is tagged: **bug** (wrong behaviour), **security**,
**reliability**, **accessibility**, **UX**, **debt** (code or tooling), or
**limitation** (a deliberate choice, with the reason).

Nothing here is a known bug in the rules: the open entries are rough edges,
missing conveniences, launch work and choices made on purpose.

---

## Time entry (Log my time)

**There is no copy of a day or a week** — _UX._ A new entry starts from the
last project and activity used, and Ctrl/⌘+Enter saves, but repeating
yesterday or last week means entering every entry again. A copy needs its own
design for bulk actions, since the API creates one entry at a time.

**An entry cannot be moved to another day** — _limitation._ The form has no
date field, though the API accepts one; an entry on the wrong day is deleted
and logged again. A date field was judged clutter for a rare need.

**The "+1h" mark barely stands off a day's excess** — _accessibility, low._
The mark over a day's extra time (`DayColumn`) is a `warning` badge on the
excess fill, about 1.07:1 between the badge and its ground, held together by
its border.

**Signing in loses the address asked for** — _UX._ A signed-out link to a page
goes to sign-in, and signing in lands on the role's home page rather than the
page the link named.

## Absences

**Why a day can't be chosen is hidden** — _UX._ The line "Days with time
logged, another absence or in a locked month can't be chosen" sits under the
date fields, where the open calendar covers it, and no day says which of the
three it is. Needs a design choice: the reason in the calendar, or on the day.

**Adding an absence ahead needs a pointer** — _UX._ On days still to come the
button shows on hover or focus in Log my time and Team time, so a touch screen
in the grid layout shows nothing; on a phone the time form's "Add absence" is
an icon with no label. Planning draws a partly absent day with the same
stripes as a whole day off, its hours only in the tooltip.

**Absence refusals read oddly** — _UX, low._ One day is worded as a range
("from Wed 2 Dec to Wed 2 Dec"), and "A day cannot be both worked and absent"
is not true of part of a day.

**An absence steps by 5 minutes, a plan by 15** — _limitation._ On a day
2h 10m away, a period plans 5h 45m of the 5h 50m left.

**An absence around locked months that aren't next to each other** — _UX,
low._ An absence's locked part is taken as one span from its first locked day
to its last (`absenceLockedPart`). That holds while locked months sit
together, as they do unless the owner reopens an older month and leaves a
later one locked. Then the form's "First day" can reach back into an earlier
locked month (the server refuses it), an open month between two locked ones is
described as locked, and such an absence can't be deleted. Fix if it bites:
describe each locked span on its own.

**Part of a day covers one day only, with no time of day** — _limitation._ An
absence of part of a day is hours on a single day, with no start or end time.

## Team time and Planning

**The team and planning grids are poor on a phone** — _UX._ Both scroll
sideways with the person column held in place, but a phone still gets the
desktop grid: on a 390px screen the 208px person column leaves room for about
one day. The timesheet already switches to a list of days on a narrow screen
(`WeekDayList`, a container query), which these grids can build on.

**Planning has no copy of a week** — _limitation._ A week's plan isn't copied
as a whole. One project across any period is already one dialog, so copying
was judged not needed; revisit if managers ask for it.

**A period's preview doesn't say what it removes** — _UX, low._ On a partly
absent day a listed project with no room left loses its plan there, which the
preview counts as "changed" without naming it.

**Plans left on someone with no hours can't be cleared from Planning** —
_limitation, low._ A person marked "No fixed hours" (or deactivated) has no
"Plan period", so plans left on them can't be removed there, though
`DELETE /planning/period` would allow it. They go when the person is removed
from the project or given working hours again. Fix if it bites: offer the
period dialog read-only with each project's delete.

**Team time's weekend opens apart in a week that starts on Sunday** — _UX,
low._ Saturday and Sunday open together from the last weekday's heading, but
with Sunday first in the week it appears at the far left and Saturday at the
right, away from the control.

**Under a project filter a new entry on another project leaves its cell** —
_limitation._ The grid is narrowed by the filter and the form's activity
picker is not (`TeamTimeView.tsx`), so time logged on another project leaves
the filtered grid and returns when the filter is cleared.

**Nobody can log new time on a project a person was removed from** —
_limitation._ Creating an entry needs current project membership
(`assertProjectMembership` in `time-logs.service.ts`), and `project_users` has
no dates: removal deletes the row. A day the person worked on the project but
didn't log can't be filled in by anyone; their existing entries stay
correctable. Workaround: add the person back, log the day, remove them again.
The real fix is project membership with dates, as team membership has.

**Planning limits** — _limitation._ A plan names no activity, so planned
billable hours cannot be computed. Weekends cannot be planned. Any logged time
hides that day's plan on the timesheet. Moving somebody out of a manager's
team keeps their future plans; only removal from the project, or archiving it,
clears them.

## People and teams

**Days before someone accepted their invitation belong to no team** —
_limitation._ A team membership starts on the day an invitation is accepted,
and expected hours on the day the account was created, so for someone who
started work earlier those days expect nothing and belong to no team. They and
the owner can still record time and absences there; their manager never
reaches them. The fix is a start date for a person, set apart from the
account.

**Membership dates can't be corrected after saving** — _limitation._ The owner
can date a move, an addition or a removal back to an open day, but nothing
edits `joined_at` or `left_at` once saved, and a move recorded with the wrong
date can't be redone. Likewise, Change manager switches `role_in_team` in
place, so nothing records since when someone has led a team; no figure or
reach depends on it today, because whoever leads a team now reaches its whole
history.

**The deactivate dialog's list isn't binding** — _UX, low._ Deactivating
deletes whatever is recorded after the last working day when the owner
confirms, not what the dialog listed, so time logged between opening the
dialog and confirming goes unnamed. The date picker's earliest day also
misses the person's last return; the API refuses such a day with a message.

**Invitations go one at a time** — _UX._ Bringing a team in means one Invite
dialog per address.

**An employee cannot see their team, their manager or their teammates** —
_limitation._ By the product boundary (`business_architecture_docs.md` §1):
that is an HR product's directory.

**Moving a manager to another team is three steps** — _limitation._ Change
manager on the old team keeping them as a member, Change team, then Change
manager on the new team. One action would change two teams at once as a side
effect, and the move is rare.

**A team is emptied one member at a time** — _limitation._ There is no bulk
move and no delete for a team that was never used: it is emptied on its panel
and archived.

## Projects, activities and Manage lists

**An archived name stays taken** — _limitation._ Names are unique across
archived projects, teams, activities and categories too, and an archived item
can't be renamed, so reusing a name means restoring the old item, renaming it
and archiving it again. The fix: names unique among active items only, with
Restore refusing a name taken meanwhile.

**Manage lists have search and a status tab, and nothing else** — _UX._ No
list can be filtered by what its columns show (a category, a role, a team, a
client) or sorted by a column; the backend list queries take `search`, paging
and `status` only. A row opens by a click anywhere on it, but the keyboard
reaches only its name.

**A client is saved as typed** — _UX, low._ The project form suggests clients
already used but keeps any spelling, so "Acme" and "ACME" both stay on their
projects' rows; the export shows case variants under one spelling, but "Acme"
and "Acme Ltd" remain two clients (D8 keeps clients a text field).

**Two projects can share a colour** — _UX, low._ A project's colour is one of
`--project-1…10`, picked by a hash of its id (`getProjectColor`), so with more
than a few projects two land on the same one. The fix stores a colour per
project, chosen to avoid the ones in use.

## Reports and the export

**Reports have no view by client, or of teams side by side** — _UX._ Where the
time went groups by project or kind of work; a client's hours across its
projects are added up only in the export. One team's figures are a filter
away, but teams are never set beside each other.

**A part-timer is named for days they never work** — _limitation._ Working
hours are one day, the same on every weekday, so somebody on 25 hours a week
is set to 5h a day: their week is right, their days are not, and Needs
attention names them for "days with no time logged" on the weekdays they
never work. The fix is a per-person day pattern.

**The working week is Monday to Friday** — _limitation._
`WORKING_DAYS_PER_WEEK` and `isWorkingDay` in the backend, `isWeekend` in the
frontend. `Company.weekStartDay` decides which day a grid starts on, not which
days are worked.

**The export builds the whole workbook in memory with no row limit** —
_reliability._ The range is capped at 366 days; the rows within it are not. It
matters only at a large company's size. A request that crosses midnight can
also read "today" twice, once per sheet.

## Periods, setup and settings

**The grace period is a fixed seven days, and a month cannot be closed
early** — _limitation._ A month invoiced on the 3rd stays editable until the
8th (`GRACE_DAYS`). A configurable grace needs a rule for when a change
applies, since locks are worked out from it and would lock or unlock past
months at once.

**Periods lists months back to the company's first only** — _limitation._
Time can be logged on any past date, so a month before the company existed
locks by itself and cannot be reopened from the page, though the API can.

**The setup checklist can finish with the owner alone** — _UX, low._ The owner
counts as the people on a project, so setup can end with nobody else in the
company, and inviting employees is never walked through. The smallest fix: the
done screen says nobody else has joined yet and offers Invite person.

**Browser Back leaves Settings without asking** — _limitation._ With unsaved
edits a link, a reload or a closed tab asks first, but Back doesn't: the App
Router gives no event to stop a history move.

**A time zone sent straight to the API keeps its spelling** — _limitation._
The API stores any valid IANA zone as sent, aliases such as `US/Eastern`
included. Dates are still right; only the screens guarantee a listed name.

**No dark theme** — _limitation._ `globals.css` declares a `dark` variant with
no dark tokens behind it, so `dark:` classes never apply.

**Not built, by choice** — _limitation._ Reminders for people who have not
logged their week; project hour budgets; unlinking Google; a list of your own
sessions and two-factor sign-in; choosing projects when inviting; email
verification, not needed while only a company's first owner signs up directly.

## Code

**The absence form's markup is one long file** — _debt, low._ Its day rules,
texts and data hook are files of their own under `shared/absence/`, the rules
with tests; `AbsenceFormModal.tsx` keeps about 730 lines of fields. Two of its
behaviours have no test, since they need the rendered form: a date picked
before the days load, and the error under the date fields.

**Types live in the service that returns them** — _debt._ Each backend module
keeps its result types beside the service that produces them (`PlanningWeek`,
`ExpectedMinutes`, `VisibleUser`); only shared ones have a types file.

**States and fields nothing uses** — _debt, low._ `CompanyStatus.SUSPENDED` is
checked at sign-in and on every request, but nothing sets it;
`AuthSession.lastActivityAt` is written and never read; `Company.currency` and
`Company.deletedAt` have no behaviour behind them.

**Accessibility, wording and the tablet width have had no pass of their own**
— _UX._ Each screen was checked as it was built; nobody has gone through the
whole product for these three.

---

## Before a production launch

The hosted copy is a development stand on free plans, with test data. None of
this matters there; all of it does with real users.

**Hosting.** The backend sleeps after fifteen minutes idle and takes about a
minute to wake, the database after five, and Vercel's free plan is for
non-commercial use. Production needs paid plans, a company domain and its own
Google sign-in URLs. The nightly clean-up of sessions and tokens runs only
while the backend is awake, and Google sign-in from a preview deployment ends
on the stand's frontend, because the callback URL is fixed.

**A backend outage looks like a sign-out** — _UX._ When the backend can't be
reached, `getCurrentUser()` returns `null`, so a page shows no sidebar or the
landing page, or the plain "Something went wrong". The fix: a "Can't reach
WorkTrack, you're still signed in" page that retries, and `null` only on a
401.

**Calls to the backend have no timeout** — _reliability._ `proxy.ts` and the
server-side reads wait as long as the backend takes. A timeout is safe on the
reads only; on the refresh it would sign people out, since the backend still
completes a rotation the proxy gave up on.

**Migrations are applied by hand** — _reliability._ `make migrate-neon` is a
guided dry run and a typed confirmation, run from a laptop; it has to become a
release step.

**No health check, and no clean shutdown** — _reliability._ No route says
whether the app and its database are up, and `main.ts` doesn't call
`enableShutdownHooks()`, so a deploy can cut requests in flight.

**No error tracking, and logs without context** — _reliability._ No request
id, no user or company on a log line, no error tracker, no uptime alert.

**No backup or restore procedure** — _reliability._ The stand relies on Neon's
own history, which nobody has tried restoring from.

**Email goes out from Resend's test sender** — _reliability._ Production needs
the company's sending domain verified. A failed send isn't retried.

**No database timeouts** — _reliability, low._ No `statement_timeout`, and the
default pool of 10 (`database.options.ts`).

**Rate limits** — _security and reliability._ The counters live in each
process's memory, so a restart resets them and two instances would count
apart. The per-client limit counts `req.ip`, which behind Render is a shared
Cloudflare address, so a busy morning can block sign-in for everyone. The
per-account limit is keyed by the submitted email and counts every attempt, so
five requests a minute with a colleague's address lock that colleague out.
Revisit all three with the production host.

**Forgot password says whether an address has an account** — _security, low._
An unknown address answers 404; sign-up and Google sign-in tell the same.
Decide for all three together: one answer whatever the address.

**Production defaults that rely on the host** — _security, low._ Swagger is
served unless `NODE_ENV=production`, and `AUTH_COOKIE_SECURE` defaults to off,
so a host that forgets either publishes the API description or sends cookies
over plain HTTP. Fix: refuse to start in production without them.

**No Content Security Policy** — _security, low._ Both apps send HSTS,
`X-Content-Type-Options`, `X-Frame-Options` and `Referrer-Policy`; a CSP needs
a nonce per request for Next's inline scripts. The frontend loads no
third-party scripts.

**A refresh from the proxy stores no client IP or user agent** —
_limitation, not verified at runtime._ After its first refresh a session
probably records Vercel's address and Node's user agent.

**CI** — _reliability and security, low._ It builds and tests both apps and
runs the migrations, but doesn't build the backend image, check that entities
and migrations agree, or run `npm audit`. Its two GitHub actions are pinned to
major tags; before a release, pin them to commit SHAs and add Dependabot.

**Account and company deletion, and a person's data export** — _limitation._
Nothing deletes an account or a company or exports a person's data. Needed
before WorkTrack holds real people's data.

## Dependency advisories that cannot be reached

From `npm audit`. Each waits until its package is updated for another reason.

- **`multer`** — `@nestjs/platform-express` 11 pins a version with a
  denial-of-service advisory; the root `package.json` overrides it to 2.5.0.
  No route uploads a file. Drop the override with the move to Nest 12.
- **`js-yaml` inside `@nestjs/swagger`** — only writes the API docs from our
  own decorators, and the docs are off in production.
- **`uuid` and the `archiver` chain inside `exceljs`** — `exceljs` calls only
  `uuid.v4`, and the export uses `writeBuffer()`, which never reaches
  `archiver`.
- **`postcss-selector-parser` inside `@tailwindcss/typography`** — runs at
  build time, on our own CSS.
- **`glob` inside TypeORM** — only the migration CLI a developer runs.
- **Dev-only tools** — the Jest, ESLint, Nest CLI and shadcn CLI chains need a
  major version upstream; they run on a developer's machine or in CI, never in
  a deployed app.

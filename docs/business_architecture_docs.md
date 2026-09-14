# WorkTrack — Product & Business Reference

The single reference for **what WorkTrack is, how its business rules behave
today, what it should become, and in what order to get there.**

Companion documents describe *how* things are built:
[`architecture.md`](./architecture.md) for the system shape,
[`backend-context.md`](../apps/backend/docs/backend-context.md) for modules and
API surface, [`auth.md`](../apps/backend/docs/auth.md) for sessions,
[`frontend-context.md`](../apps/frontend/docs/frontend-context.md) for the UI
layer. This document does not repeat them; it explains the product those pieces
serve.

**Status of this document.** Sections 1–6 describe behaviour verified against
the current code and are authoritative. Sections 7–9 describe agreed direction
and are the basis for planning work. Section 10 lists decisions that are still
genuinely open.

---

## 1. What WorkTrack is

WorkTrack is a time-tracking and work-visibility application for a **single
company**, used by everyone in it.

Employees record how long they worked, on which project, doing what kind of
activity. Managers and owners use that record to see whether work is being
logged, where time is going, and how actual effort compares to what was planned.

The company doing the work is a **services company**: most work is done for
external clients on client projects, alongside internal activities such as
education, bench time and internal projects.

### What WorkTrack is not

Deliberate exclusions. Each of these is handled outside the application, and
building them here would be scope creep:

- **Not an invoicing or revenue system.** Rates, invoices and money are handled
  elsewhere. WorkTrack tracks *hours*, including the billable/non-billable
  split, and hands those hours off.
- **Not a leave-management system.** Leave requests, approvals and balances live
  in a separate system. WorkTrack only needs to *know* that someone was absent.
- **Not an approval workflow.** There is no timesheet submission and no manager
  sign-off.
- **Not an attendance system.** WorkTrack records durations, not clock-in and
  clock-out times.
- **Not a task tracker.** Projects and activities are the unit of work. There
  are no tickets, tasks or subtasks.

### Multi-company

The data model is already multi-tenant: `Company` is the tenant root, every
domain table carries `companyId`, and every service query filters on it. A
future multi-company SaaS version therefore remains possible.

**This is not a current goal and must not drive decisions.** The tenant boundary
is kept because it already exists and removing it would cost more than keeping
it — not because a SaaS product is being built. Do not add multi-company
features, and do not compromise the single-company product to accommodate a
hypothetical one.

---

## 2. Agreed product decisions

The decisions below are settled. They are recorded with their reasoning so that
future work does not silently reverse them, and so that a change of mind is a
visible decision rather than a drifting implementation.

### D1 — Time entries record duration only

A time entry is *a number of minutes on a date*, not a time range. There is no
start time, end time, or running timer.

*Why.* The company needs to know how much was worked on what, not when someone
was at their desk. Durations also suit retrospective filling — the common real
behaviour of logging a few days at once.

*Consequence.* `time_logs` keeps `minutes: int` and `date: date`, with no clock
columns. The weekly grid stays the primary entry surface.

### D2 — Billability is decided per entry, not per project

Whether time is billable is a property of the individual entry. It defaults from
`Activity.defaultBillable` and can be overridden whenever the entry is created
or edited.

*Why.* Client work is not automatically billable. Hours beyond an estimate, plus
communication, investigation and setup that the client does not pay for, are
**client work that is non-billable**. A project-level or client-level flag cannot
express this.

*Consequence.* Three categories must remain distinguishable in reporting:
billable client work, non-billable client work, and internal work. The first two
are separated by `TimeLog.isBillable`; the third by the project the time was
logged against.

### D3 — Planning is advisory, never restrictive

Managers may plan future work for people. Employees are never forced to follow
that plan and are never blocked by it.

*Why.* Reality diverges from the plan constantly and legitimately: someone
planned for one project ends up on another, works different hours, or sits on
the bench. A plan that blocks logging would make the record *less* accurate, not
more.

*Consequence.* Nothing in the time-logging path may ever consult
`planning_entries`. This holds today — `TimeLogsService` has no reference to
planning — and must be preserved. The value of planning is forward visibility
and, later, planned-vs-actual reporting.

### D4 — No approval workflow

Employees log time directly. There is no submit step, no manager approval, and
no returned-for-correction state.

*Why.* The company does not need it, and it would add a status model,
notifications and chasing for no benefit.

*Consequence.* A time entry has no lifecycle status. Correctness comes from the
person who did the work, and from period closing (D5) rather than sign-off.

### D5 — Completed periods are locked

Once a period is closed — typically after the hours in it have been used for
invoicing — its time entries are frozen. Nobody can create, edit or delete
inside a locked period.

*Why.* Historical data used for invoicing and reporting must not change
underneath those numbers. This gives the stability an approval workflow would
otherwise provide, at a fraction of the cost.

*Consequence.* `ReportingPeriod` with status `OPEN | LOCKED` is the mechanism.
It is already implemented and enforced on every time-log write. Note the flow:
**log time → no approval → period closes → history is immutable.**

### D6 — Absences are not time entries

Time logs represent **actual worked time only**. Vacation, sick leave and public
holidays are never logged as time.

*Why.* Mixing absence into worked time corrupts every hours figure — utilisation,
project totals, billable ratio — and forces absences to be attached to a fake
project in order to exist at all.

*Consequence, and this reverses an existing design.* Absence needs its own
representation, separate from `TimeLog`, supporting **date ranges** so a
two-week holiday is recorded once rather than fourteen times. It exists so that
a person and a future report can see *why* no time was logged.

The current `Activity.isAbsence` flag contradicts this decision. It is unused by
any business logic today and should be removed when absences are built. See §7
Phase 2.

### D7 — No money in WorkTrack

No rates, no revenue, no cost, no margin.

*Why.* Invoicing is handled externally. Rates would also bring genuine
complexity — a rate change must not retroactively rewrite last quarter's figures,
which means effective-dated rates — and cost data would put salary-grade
information into the app.

*Consequence.* `Company.currency` has no consumer and should not acquire one.
Reporting deals in hours. The handoff to invoicing is an **export of hours**, not
a monetary figure (see §7 Phase 5).

### D8 — Clients stay a text field, for now

`Project.clientName` remains free text. There is no `Client` entity, and
internal work is simply projects with no client name.

*Why.* Work is organised around client/project pairs, and that is sufficient
today. A full Client module costs a new domain module, migration of existing
values, and admin CRUD — for reporting nobody has asked for yet.

*Known limitation, accepted.* Per-client reporting depends on the string being
typed identically every time; a typo silently splits one client in two. If
reliable client-level reporting becomes a requirement — most likely if WorkTrack
is ever extended to other businesses — promoting clients to an entity is the
correct move at that point, not before.

---

## 3. Domain model

Verified against the entities in `apps/backend/src/*/entities/`. See
[`backend-context.md`](../apps/backend/docs/backend-context.md) for columns,
indexes and constraints.

```text
Company  (tenant root — everything below carries companyId)
│
├── User            role: OWNER | MANAGER | EMPLOYEE
│                   status: ACTIVE | DEACTIVATED
│                   capacityHoursPerWeek (default 40)
│
├── Team ──< TeamMembership >── User
│                   roleInTeam: MEMBER | MANAGER
│                   time-bounded: joinedAt / leftAt
│
├── ActCategory ──< Activity          isAbsence, defaultBillable
│
├── Project  (clientName: free text)
│     ├──< ProjectActivity >── Activity     which activities are allowed here
│     └──< project_users    >── User        who may log against this project
│
├── TimeLog         user + projectActivity + date + minutes + isBillable
├── PlanningEntry   user + projectActivity + date + plannedMinutes + createdBy
└── ReportingPeriod name + startDate + endDate + status (OPEN | LOCKED)
```

**The pivotal join is `ProjectActivity`.** Time is never logged against a
project or an activity alone — always against a specific *activity enabled on a
specific project*. This is what makes "Development on Client X's redesign"
distinguishable from "Development on our internal tooling".

**A user belongs to exactly one company.** Email and `googleId` are globally
unique. The same person working at two companies would need two accounts with
different email addresses. There is no shared identity spanning companies —
consistent with §1's position on multi-company.

**Team membership is historical, not current-state.** Rows are closed with
`leftAt` rather than deleted, so "who was on this team in March" remains
answerable. Managership is derived from membership: a manager sees people who
share an active team with an active `roleInTeam = MANAGER` membership of theirs.

---

## 4. Business rules enforced today

All verified in the current implementation.

### Time logging

Every write passes four checks, in this order:

1. **Period lock** — a write touching a `LOCKED` period is rejected (403). On
   update, both the old and the new date are checked, so an entry cannot be
   moved into or out of a locked period.
2. **Ownership** — the entry is matched on `userId` **and** `companyId`. No role
   can edit another person's entry.
3. **Project-activity validity** — the `ProjectActivity` must belong to the
   caller's company, be active, and sit on an ACTIVE project with an ACTIVE
   activity.
4. **Project membership** — a `project_users` row must exist for
   `(projectId, userId)`. Submitting a valid `projectActivityId` for a project
   you are not assigned to is rejected (403).

Additional constraints: a single entry is 1–1440 minutes; one person's total for
a single date cannot exceed 1440 minutes. The daily total is enforced under a
`pessimistic_write` lock on the user row inside a transaction, so concurrent
writes cannot exceed the budget between them.

`isBillable` defaults from `Activity.defaultBillable` when the entry does not
specify it (D2).

### The invariant worth internalising

> **Read visibility widens with role. Write ownership never does.**

Nobody — owner included — creates, edits or deletes another person's time log.
This is what makes a time entry mean "this person says they did this work".
Changing it would require an approval or audit model first, and D4 says there
isn't one.

### Planning

A `PlanningEntry` is company + target user + project activity + date + planned
minutes, recording who created it. Unique on
`(companyId, userId, projectActivityId, date)`. Same 1440 min/day ceiling and
the same pessimistic user-row lock as time logs.

An OWNER may plan for any ACTIVE user in the company; a MANAGER for themselves
and users in teams they manage. Employees cannot write planning at all.

Planning does **not** create time logs, does not restrict them, and does not
compute analytics (D3).

### Expected hours

Currently derived entirely from `Company.standardWorkHoursPerDay` (default 8):
the weekly target is that value multiplied by the number of weekdays in the
week. Weekends are Saturday and Sunday.

**`User.capacityHoursPerWeek` is stored and editable but read by nothing.** A
part-time employee is therefore measured against the full-time target. This is a
correctness gap, not a design decision — see §7 Phase 3.

### Period locking

`ReportingPeriod` rows are named date ranges with `OPEN | LOCKED` status, unique
by name per company, with `endDate >= startDate` enforced. Only an OWNER creates
or updates them. `isDateLocked` backs the check in rule 1 above.

**Planning entries are not period-locked** — `PlanningService` never calls
`isDateLocked`. This is reasonable, since planning concerns the future and
carries no invoicing weight, but it is currently implicit. See §10 Q1.

### Company settings and lifecycle

The company holds `timezone`, `currency`, `weekStartDay` and
`standardWorkHoursPerDay`. The timesheet reads all except currency rather than
hardcoding calendar assumptions. Slugs are unique and regenerated on rename.

A `SUSPENDED` company cannot be updated and cannot authenticate.
`Company.deletedAt` exists as a column with no soft-delete behaviour behind it.

### Access

A new company is created by self-service signup, which creates the `Company` and
its first `OWNER` together. Everyone else joins by **invitation**: an owner or
manager invites an email address with a role, and the invitee completes signup
by setting a password or via Google. Invitation tokens are stored hashed and are
`PENDING | ACCEPTED | REVOKED`.

Users are archived, never deleted (`ACTIVE | DEACTIVATED`). A user cannot archive
themselves, an OWNER account cannot be archived, and only an OWNER may modify
another OWNER or grant the OWNER role.

---

## 5. Roles and permissions

`OWNER | MANAGER | EMPLOYEE`. There is no `ADMIN` role.

| Area | OWNER | MANAGER | EMPLOYEE |
| :--- | :--- | :--- | :--- |
| Company settings | read + update | read | read |
| Users | full CRUD | list + read | own profile only |
| Invitations | create | create | — |
| Teams, Projects, Activities, Categories | full CRUD | full CRUD | read |
| Time logs — read | whole company | users in teams they manage | own only |
| Time logs — write | **own only** | **own only** | **own only** |
| Planning — read | whole company | users in teams they manage | own only |
| Planning — write | any active user | self + managed users | — |
| Reporting periods | create + update | read | read |

**Manager scope comes from team leadership, not from the role.** A MANAGER who
leads no team sees nobody. Visibility is computed from active
`TeamMembership` rows with `roleInTeam = MANAGER`, so it follows team changes
automatically and respects membership history.

Note that MANAGER currently has full CRUD over teams, projects, activities and
categories company-wide — not restricted to their own teams. See §10 Q3.

---

## 6. Where the product actually stands

An honest assessment. The backend is substantially ahead of the frontend, and
the gap is the main fact about the project's current state.

### Working end to end

- **Authentication and sessions** — email/password and Google, HTTP-only
  cookies, rotating refresh tokens, password reset, invitation-based signup.
- **Employee timesheet** — the most complete feature and the best reference for
  frontend conventions. Log, edit and delete time against assigned projects,
  driven by company work settings, with loading, error, empty and over-target
  states.
- **Admin CRUD** — users, teams, projects, activities and categories.
- **Onboarding** — setup-state endpoints tell a new workspace what it still has
  to configure, and a wizard renders from them.

### Backend-only, no user interface at all

- **Planning.** Full CRUD with role-scoped write access. No screen exists.
- **Reporting.** Period lifecycle and a planned-vs-actual aggregation. No screen
  exists — including no way for an owner to actually lock a period, despite
  locking being enforced everywhere.
- **Team time visibility.** `GET /time-logs` is already role-filtered and
  accepts user, project and date-range filters, but nothing consumes it beyond
  the employee's own week.

### Broken or missing for managers and owners

An owner or manager who signs in **lands on a blank page** once workspace setup
is complete, and `managerNavigation` contains no link to their own timesheet.
The application currently serves one of its three roles.

The product records time but cannot yet answer the question it exists to answer:
*did the team log what they were supposed to, and where did the time go?*

### Fields that exist but do nothing

| Field | Status |
| :--- | :--- |
| `Activity.isAbsence` | Read by no logic. **Contradicts D6** — remove with Phase 2. |
| `User.capacityHoursPerWeek` | Read by no logic. Part-time staff measured wrongly. Phase 3. |
| `Company.currency` | Read by no logic. **Should stay unused** under D7. |
| `Company.deletedAt` | Column with no soft-delete behaviour behind it. |

### Authorization gaps

One real gap, not a design decision:

1. **Manager scope is incomplete in planned-vs-actual.**
   `ReportingService.getPlannedVsActualReport` pins an EMPLOYEE to their own
   data, and a MANAGER who names a `userId` is now checked against
   `isUserInManagedTeams`. But that check only runs *when a `userId` is given*.
   A manager who calls the endpoint without one leaves the user filter unset, so
   the aggregates are scoped by `companyId` alone and come back **company-wide**.

A second gap remains on the frontend, though it no longer leaks data:
the admin pages check only for a session, not for a role, so an employee who
navigates to an admin route still renders the admin UI. The backend now refuses
to fill it — every admin project route answers an employee with 403 — so what
is left is a broken-looking screen rather than an exposure.

**Closed since this section was written.** The project read routes
(`GET /projects`, `GET /projects/:id`, `GET /projects/:id/users`) used to filter
on `companyId` only, letting any employee enumerate every project with its full
roster. They now carry an OWNER/MANAGER role guard. `/admin/*` was also added to
the middleware's guarded prefix list, so an unauthenticated visitor is
redirected to login.

### Engineering state

Test coverage has started but is thin: a single suite,
`team-visibility.service.spec.ts`, covering the role-visibility filters against
a real database. Nothing else is covered, and there is still no CI, so even that
suite runs only when someone remembers to.

The backend has a production image (`apps/backend/Dockerfile`) and migrations
can run as a deployment release step. The frontend has no image on purpose — it
is built by its host. Nothing is hosted yet.

Access tokens live one minute, so sessions drop during ordinary use even though
refresh works.

---

## 7. Target product and roadmap

### What "finished" looks like

For the company using it:

- **Every employee** logs their week quickly against the projects they are on,
  marking client work billable or not, and can see at a glance whether their week
  is accounted for — with absences explaining any gaps rather than reading as
  missing time.
- **Every manager** opens one screen and sees their team's week: who logged, who
  is short, where the time went. They can plan upcoming work for their people
  without that plan constraining anyone.
- **The owner** sees the same across the company, closes periods once hours have
  been used for invoicing, and can export hours — split by client, project, and
  billable/non-billable — to hand to whoever produces the invoices.
- **Nobody** approves anybody's timesheet, and nobody edits anybody else's time.

### Roadmap

High-level and ordered by dependency. Each phase is a coherent product increment,
not a task list.

---

**Phase 0 — Close the authorization gaps**

Both gaps in §6 leak data across roles today. The project one exposes the
company roster with email addresses to every employee; the reporting one hands
managers company-wide figures. Everything later builds on these code paths, so
fixing them first avoids building on top of a leak.

Scope: role guards on the project read routes, trimming the eager user roster out
of the default project response, the missing manager team check in
planned-vs-actual, and `/admin/*` guarded properly on both middleware and page.

This is also the natural place for the **first tests**. The role-visibility
filters are the highest-value thing to test in the codebase — they are security
logic, they are about to gain a second consumer, and they are pure query
construction that tests well.

*Depends on: nothing. Blocks: everything, in practice.*

---

**Phase 1 — Manager and owner team time view**

The largest missing piece of product value, and the cheapest large feature
available, because the authorization work already exists.

Owners and managers get somewhere to land and a team week view: people down the
side, days across the top, totals in the cells, filterable by team and project,
with under-target rows visible at a glance and a read-only drill-down into one
person's entries.

Two constraints that matter more than the UI:

- **The summary must reuse the existing visibility filter.** A hand-written
  second copy of the manager/team SQL is exactly how authorization bugs get
  introduced. The summary and the list must never be able to disagree about who
  a manager may see.
- **Aggregate in the database, not the browser.** Summing raw logs client-side
  works for one person's week and will not survive the whole company.

Also closes the blank home page and adds the missing timesheet link for
managers.

*Depends on: Phase 0. Blocks: Phases 3 and 5 have their natural home here.*

---

**Phase 2 — Absences**

Implements D6. A new representation, separate from `TimeLog`, covering a **date
range** with a type (vacation, sick leave, public holiday) so a two-week absence
is recorded once. Surfaced in the timesheet and the team view so that a week with
no logged time reads as "on holiday" rather than "did not log".

Includes removing `Activity.isAbsence`, which contradicts D6 and is read by
nothing.

Deliberately excluded: requests, approvals, balances, accrual. Leave management
lives elsewhere (§1). WorkTrack records that the absence happened.

Two decisions to settle when this starts: who may record an absence for whom
(managers for their people is the obvious answer, mirroring planning's write
scope), and whether absences respect period locking (§10 Q1).

*Depends on: Phase 1 for the surfaces to show absences in. Blocks: Phase 3 —
expected hours cannot be right until absences are known.*

---

**Phase 3 — Correct expected hours**

Makes "is this person short of target?" actually true. Today the answer uses a
company-wide 8-hour day for everyone.

Three inputs must combine: `User.capacityHoursPerWeek` for part-time staff,
`Company.standardWorkHoursPerDay` as the fallback, and absences from Phase 2
reducing the days expected. A person on holiday for a week should be at target,
not 40 hours short, and a 3-day-a-week employee should never be measured against
5 days.

*Depends on: Phases 1 and 2. Blocks: Phase 5's utilisation figures.*

---

**Phase 4 — Planning interface**

Surfaces the planning module that already exists. Managers assign future work per
person, per project-activity, per day, over a week or longer view. Employees see
their own plan **read-only** — as useful context for what they are expected to be
working on, never as a constraint (D3).

One decision to settle: planning currently does not require the target user to be
assigned to the project, while time logging does. Planning someone onto a project
they cannot log against produces a plan that is impossible to fulfil. See §10 Q2.

*Depends on: Phase 1 for navigation and the team context. Blocks: the
planned-vs-actual half of Phase 5.*

---

**Phase 5 — Reporting and export**

Turns the data into the answers the company actually needs:

- **Hours by client, project and activity** over a date range.
- **The billable split** — billable client work, non-billable client work, and
  internal work kept distinct (D2). This is the number the services business
  runs on.
- **Utilisation**, once Phase 3 makes expected hours trustworthy.
- **Planned vs actual**, once Phase 4 means there is a plan worth comparing to.
  The backend aggregation already exists.
- **Export.** Because invoicing happens outside WorkTrack (D7), someone has to
  get hours *out*. This is a functional requirement, not a nice-to-have — without
  it the billable/non-billable distinction has no consumer. Format is open
  (§10 Q4).

Also needs the **period-closing interface**: locking is enforced everywhere but
an owner has no way to actually lock anything today.

*Depends on: Phases 3 and 4 for the utilisation and planned-vs-actual views. The
hours and billable reports plus export depend only on Phase 0 and could ship
earlier if invoicing needs them sooner.*

---

**Phase 6 — Hardening**

Not last in importance, only in sequence — parts of it should be pulled forward
whenever the pain justifies it.

Meaningful test coverage beyond Phase 0's start; CI; a sane access-token
lifetime (one minute drops sessions during ordinary use); a role check on the
admin routes in the frontend; reminders for people who have not logged their
week, if wanted (§10 Q5); and the accessibility items listed as TODOs in the
frontend documentation.

---

### Dependency summary

```text
Phase 0  Authorization + first tests
   │
   ├──────────────────────────────────────────┐
   │                                          │
Phase 1  Team time view                  (hours + billable
   │                                       reports & export
   ├── Phase 2  Absences                   can branch early)
   │      │                                       │
   │   Phase 3  Expected hours ────────┐          │
   │                                   │          │
   └── Phase 4  Planning UI ───────────┤          │
                                       │          │
                            Phase 5  Reporting ◄──┘
                                       │
                            Phase 6  Hardening
```

---

## 8. Constraints that must survive every future change

Short list. These are the things that would be expensive or dangerous to break.

1. **Nobody writes another user's time log.** Not managers, not owners.
2. **Tenant isolation is enforced in services, never assumed from the request.**
   Every domain query filters on `companyId`.
3. **Role visibility is computed in one place per resource.** Reuse
   `applyUserVisibility`; never write a second copy of the manager/team SQL.
4. **Time logging never consults the plan** (D3).
5. **Locked periods are immutable** — including moving an entry into or out of
   one (D5).
6. **Archive, never delete.** Projects, activities, categories, teams and users
   are archived so historical time stays resolvable. `ProjectActivity` rows are
   deactivated rather than removed for the same reason. Team membership closes
   with `leftAt` rather than deleting the row.
7. **Aggregate in the database.** Client-side summing does not survive company
   scale.

---

## 9. Documentation map

| Document | Covers |
| :--- | :--- |
| **This document** | Product definition, business rules, decisions, roadmap |
| [`architecture.md`](./architecture.md) | System shape, request flow, where to start |
| [`backend-context.md`](../apps/backend/docs/backend-context.md) | Modules, API surface, data model, constraints |
| [`auth.md`](../apps/backend/docs/auth.md) | Tokens, sessions, guards, OAuth, password flows |
| [`frontend-context.md`](../apps/frontend/docs/frontend-context.md) | Routing, data layer, design tokens, components |
| [`README.md`](../README.md) | Setup, commands, environment |
| [`CLAUDE.md`](../CLAUDE.md) | Coding conventions and workflow rules |

---

## 10. Open decisions

Genuinely undecided. Each includes a recommendation, but none should be treated
as settled until confirmed.

**Q1 — Do absences respect period locking?**
Time logs freeze when a period locks (D5). Absences are not time and carry no
invoicing weight, so freezing them is less obviously necessary.
*Recommendation: freeze them too.* If a closed month's reports show absence
alongside hours, letting absence change afterwards makes those reports unstable
in exactly the way D5 exists to prevent. Cost is minimal — the same
`isDateLocked` check.

**Q2 — Should planning require project membership?**
Time logging requires a `project_users` row; planning does not. A manager can
therefore plan someone onto a project that person cannot log against.
*Recommendation: warn, do not block.* Planning ahead of assignment is legitimate
— you plan the quarter, then staff it. Blocking would make planning restrictive
in the wrong direction. But the planning UI should flag the mismatch, and ideally
offer to assign the person to the project.

**Q3 — Should managers administer company-wide resources?**
MANAGER currently has full CRUD over teams, projects, activities and categories
across the whole company, while user management is OWNER-only. A manager can
create and archive a project belonging to a team they have nothing to do with.
*Recommendation: decide explicitly rather than leave it as an accident.* If the
company is small and managers are trusted broadly, the current setting is fine
and should simply be documented as intentional. If not, the natural narrowing is
projects scoped to teams they lead.

**Q4 — What form should the hours export take?**
Required by Phase 5, since invoicing is external (D7).
*Recommendation: start with CSV* — one row per person per project per day, or
per person per project per period, with billable and client columns. Whoever
produces invoices already works in a spreadsheet. Confirm the grouping with them
before building; the wrong granularity makes the export useless.

**Q5 — Should the app chase people who have not logged time?**
The team view shows who is short, but somebody still has to look.
*Recommendation: defer until the team view has been used for a while.* If chasing
turns out to be the recurring cost, a weekly email to people with an incomplete
week is the smallest thing that helps. Notifications are easy to add and hard to
remove once people rely on them.

**Q6 — What happens to `Company.deletedAt` and `Company.currency`?**
Both are columns with no behaviour. `currency` should stay unused under D7.
`deletedAt` implies a soft-delete story nobody has written.
*Recommendation: leave both alone and revisit only if a real need appears.*
Removing columns costs a migration for no user-visible gain; the risk is someone
later assuming they work.

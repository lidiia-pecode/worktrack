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

**Last verified against the code: 21 September 2026.** At that point Phases 0
and 1 of the roadmap in §7 were delivered, as were Scopes C and D of
[`permission-model.md`](./permission-model.md) §7. Scope E — project assignment
and disclosure — is in progress: its business rules were settled the same day,
it is written up in [`current-scope.md`](./current-scope.md), and the first
step, assignment scope, is implemented.

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

### D9 — Time-log write access follows read visibility

Creating, editing and deleting a time entry is allowed for:

- **OWNER** — anyone in the company.
- **MANAGER** — employees in the teams they actively manage, and nobody else.
- **EMPLOYEE** — themselves only.

*Why.* The person who notices a wrong or missing entry is usually not the person
who logged it. There is no approval step to catch it (D4), so without this the
only remedy is to ask the employee and wait — which is why weeks stay wrong.
Write scope now mirrors read scope, which also makes the rule easy to state and
to test.

*Consequence, and this reverses a previous invariant.* Write access is no longer
"own entries only", so the boundary has to be enforced in the service layer, from
the same team-leadership source as read visibility. Hiding a button is not a
permission.

Everything else about a time entry is unchanged. Period locking (D5) applies to
every role without exception; the daily 1440-minute ceiling, the project
membership requirement and the billability default all still hold, and they apply
to **the person the entry belongs to**, not to whoever is typing.

*Deliberately not included: audit tracking.* `TimeLog` records no actor, and
nothing in the current architecture requires one. Adding `lastEditedById` is a
migration and a UI change for a need nobody has stated yet, so it stays out until
someone asks for it.

### D10 — A manager sees only their own teams, everywhere

An OWNER has company-wide visibility: every team, every person. A MANAGER sees
the teams they actively manage and the people in them — and that limit applies
to every list, not only to time data.

*Why.* The rule already holds for time logs, planning and reporting, but
`GET /users` and `GET /teams` still hand a manager the whole company. A manager
who may not read someone's time can still read their profile and pick them out
of a filter, which makes the boundary look arbitrary and exposes the full
roster.

*Consequence.* The user and team list endpoints have to be narrowed for
managers. Together with D9 this makes one rule cover both halves: a manager reads
and writes within their own teams. It settles the read half of §10 Q3; whether
managers should also administer company-wide teams and projects is still open
there.

*Staffing was not covered by this decision.* `GET /users` used to answer two
questions at once — who a manager's people are, and who they may add to a team
or project. D10 narrowed only the first. The second kept its own company-wide
source, `GET /users/assignable`, because narrowing a picker while the write path
behind it is unchecked would be a hidden button rather than a permission.

**The rule that replaces it was settled on 21 September 2026** and is now
enforced: a manager assigns only the people they manage, plus themselves, both
in `GET /users/assignable` and in `syncProjectUsers`; their save changes nobody
outside that set; and that same set is all they see of a project's membership,
so sharing a project discloses nobody. See
[`permission-model.md`](./permission-model.md) §3.4 and §3.5, and §0 of
[`current-scope.md`](./current-scope.md).

**D10 therefore has no exceptions left.** A manager sees the people in the teams
they lead, on every list in the product.

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
├── Invitation      email + role + status (PENDING | ACCEPTED | REVOKED)
│                   teamId (the team it is for) + invitedById (who sent it)
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

> **Write access for a time entry matches read visibility: owners company-wide,
> managers within the teams they lead, employees themselves.**

This is enforced in the service, and the caller is kept distinct from the
entry's owner throughout the write path — the daily ceiling, the project
membership and the row lock all follow the owner. A time entry now means "this
person, or someone answerable for them, says this work happened".

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
manager invites an email address with a role and, for an employee, a team, and
the invitee completes signup by setting a password or via Google. An owner may
invite a manager or an employee, a manager only an employee into a team they
lead. Accepting an invitation that carries a team creates the team membership,
always as a `MEMBER`, in the same transaction that creates the user. Invitation
tokens are stored hashed and are `PENDING | ACCEPTED | REVOKED`.

Users are archived, never deleted (`ACTIVE | DEACTIVATED`). A user cannot archive
themselves, an OWNER account cannot be archived, and only an OWNER may modify
another OWNER or grant the OWNER role.

---

## 5. Roles and permissions

`OWNER | MANAGER | EMPLOYEE`. There is no `ADMIN` role.

| Area | OWNER | MANAGER | EMPLOYEE |
| :--- | :--- | :--- | :--- |
| Company settings | read + update | read | read |
| Users — roster | full CRUD | list + read, within their teams | own profile only |
| Users — assignment list | whole company | whole company | — |
| Invitations | create, any role; a team only on an employee invitation | create, EMPLOYEE only, always into a team they lead | — |
| Teams | full CRUD | read, within their teams; remove a member | — |
| Projects | full CRUD | full CRUD | only their own, through `GET /projects/me/activities` |
| Activities, Categories | full CRUD | full CRUD | read |
| Time logs — read | whole company | users in teams they manage | own only |
| Time logs — write | whole company | own, plus users in teams they manage | **own only** |
| Planning — read | whole company | users in teams they manage | own only |
| Planning — write | any active user | self + managed users | — |
| Reporting periods | create + update | read | read |

This matrix is what the code does today. The intended model —
Owner-owned structure, manager-operated teams — is in
[`permission-model.md`](./permission-model.md) §3.

**Manager scope comes from team leadership, not from the role.** A MANAGER who
leads no team sees nobody, and under D9 may therefore edit nobody's time but
their own. Scope is computed from active `TeamMembership` rows with
`roleInTeam = MANAGER`, so it follows team changes automatically and respects
membership history.

D9 is implemented: `TimeLogsService` shares one scope check between reads and
writes, so the two cannot drift apart, and the team view's per-person panel is
where an owner or manager acts on it.

Team structure is the Owner's: only an owner creates, renames or archives a
team, adds a member or changes a `roleInTeam`. A manager may remove a member
from a team they lead, because removal only narrows their own reach.

Note that MANAGER still has full CRUD over projects, activities and categories
company-wide — not restricted to their own teams. See §10 Q3.

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
- **Team time view** — owners and managers land on `/team`, read their people's
  week filtered by team and project, and open any row to see that person's
  entries day by day and correct them.
- **Manager scope** — a manager's user, team and time lists all narrow to the
  teams they actively lead, and so does the list they staff from, plus
  themselves.
- **Onboarding** — setup-state endpoints tell a new workspace what it still has
  to configure, and a wizard renders from them.

### Backend-only, no user interface at all

- **Planning.** Full CRUD with role-scoped write access. No screen exists.
- **Reporting.** Period lifecycle and a planned-vs-actual aggregation. No screen
  exists — including no way for an owner to actually lock a period, despite
  locking being enforced everywhere.

### Phase 1 delivered

Owners and managers land on `/team` and see their people's week as a grid,
filterable by team and project, and can open a row to read and correct that
person's entries. A manager's user, team and time lists all narrow to the teams
they actively lead; Scope E narrowed the staffing list the same way, plus the
manager themselves.

**Decided while building it: `/team` stays a summary grid.** Whether it should
become a full team timesheet — entries or per-project rows inside the cells —
was raised and rejected. The grid and the timesheet answer different questions:
the grid is for scanning who logged and how much, the timesheet for inspecting
what a week consisted of, and that already exists. A team timesheet would need
per-user-per-day-per-project data the summary endpoint does not return, and
would be unreadable at company size. "Where did the time go" is answered by the
project filter at team level and by the per-person panel for one person;
cross-cutting hours by client and project belong to Phase 5.

### Scope C delivered

Team structure became the Owner's alone: creating, renaming and archiving a team,
adding a member and setting anyone's `roleInTeam` are Owner actions, and a
manager may only remove someone from a team they lead. Removal closes `leftAt`
instead of deleting the row, so past time data stays explicable. An invitation's
role now follows the caller, so a manager cannot appoint another manager. The
teams screen offers a manager only what still works.

**This closes the escalation**, so D10 is a boundary rather than a route-level
narrowing. It also left a deliberate gap — a manager could not put anyone on
their team at all — which Scope D then closed.

### Scope D delivered

`Invitation` carries `teamId` and `invitedById`. A manager must invite into a
team they actively lead; an owner may name any active team, or none. A team can
only be attached to an EMPLOYEE invitation. Accepting the invitation creates the
membership as a `MEMBER`, in the same transaction that creates the user, so a
new hire is inside their inviter's scope from the moment they join. If the team
was archived in the meantime, the person is still created and the Owner places
them.

**A manager still only ever gains people who are new to the company.** There is
no route to adding an existing user to a team, which is what kept Scope C's
guarantee intact.

### Scope E in progress

Assignment scope has landed: `syncProjectUsers` takes the caller and refuses
anyone outside the people they manage, `GET /users/assignable` returns that same
set plus the caller themselves, and a manager's save only adds and removes
inside it. So has disclosure: a project's member list is scoped to the caller
and narrowed to identity fields, while the project still reports its true size.
And managers and owners may now be project members, so a manager finally has
something to log against. What is left is archiving — saving a project whose
member has since been archived still fails. That is what remains of gap 4 under
**Authorization gaps** below, and [`current-scope.md`](./current-scope.md) is
the plan for closing it.

### Fields that exist but do nothing

| Field | Status |
| :--- | :--- |
| `Activity.isAbsence` | Read by no logic. **Contradicts D6** — remove with Phase 2. |
| `User.capacityHoursPerWeek` | Read by no logic. Part-time staff measured wrongly. Phase 3. |
| `Company.currency` | Read by no logic. **Should stay unused** under D7. |
| `Company.deletedAt` | Column with no soft-delete behaviour behind it. |

### Authorization gaps

Current-state facts, kept numbered so other documents can point at them. Closed
items stay on the list with their resolution rather than disappearing. The rules
meant to replace the open ones are in
[`permission-model.md`](./permission-model.md), and the order they are fixed in
is §7 of that document.

1. **A manager can widen their own visibility — closed.** Creating, renaming
   and archiving a team, adding a member and setting `roleInTeam` are now Owner
   actions at the route level, so a manager can no longer build a team around
   themselves to reach another person's time. **D10 is a boundary rather than a
   route-level narrowing.** The teams screen offers a manager only what still
   works: reading the teams they lead and removing someone from them.

2. **A manager can invite another manager — closed.**
   `validateInvitationRole` now takes the caller's role: an owner may invite a
   manager or an employee, a manager only an employee.

3. **An invitation cannot place anyone in a team — closed.** `Invitation` now
   carries `teamId` and `invitedById`. A manager must name a team they lead, and
   accepting the invitation creates the membership, so a new hire is inside
   their inviter's scope from the moment they join.

4. **Project membership — assignment scope closed, archiving still open.**
   `syncProjectUsers` now takes the caller and refuses anyone outside the people
   they manage, and the diff only removes inside that set, so a manager cannot
   drop someone else's person by submitting a list that never contained them.
   What remains is archiving: saving a project with an archived member still
   404s, because "may be newly assigned" and "may remain assigned" are one
   check.

5. **`GET /projects/:id` disclosed every member's name and email — closed.**
   Both member routes are now scoped to the caller and serialize through
   `AssignableUserResponse`, so a manager reads nobody from another team and
   capacity and credential flags never leave a project route. The project still
   reports its true member count, so a scoped list does not make a staffed
   project look empty. D10 has no way around it left.

6. **Managers and owners cannot be project members — closed.** The client used
   to filter them out of the picker and strip them again on submit; both are
   gone, and the server always stored whatever it was given. A manager can now
   put themselves on a project and log against it, including a manager who
   leads no team.

7. **Manager scope in planned-vs-actual — closed.** Both aggregates in
   `ReportingService.getPlannedVsActualReport` now run through
   `applyUserVisibility`, so a manager who omits `userId` gets their own teams
   rather than the whole company, and an employee is pinned to themselves.
   Naming a `userId` outside a manager's teams is still refused with 403.

`GET /users` and `GET /teams` were two earlier gaps and are closed at the route
level.

**The archiving half of gap 4 is all that is still open, and it is the rest of
Scope E.** Everything else on this list is closed.

**Closed since this section was written.** The project read routes
(`GET /projects`, `GET /projects/:id`, `GET /projects/:id/users`) used to filter
on `companyId` only, letting any employee enumerate every project with its full
roster. They now carry an OWNER/MANAGER role guard. `/admin/*` was added to the
middleware's guarded prefix list, so an unauthenticated visitor is redirected to
login, and every `/admin/*` page and `/team` now calls `requireManagerAccess()`,
so an employee who navigates there is sent back to their own timesheet instead
of rendering an admin screen the backend would refuse to fill.

### Engineering state

Test coverage has started but is thin: eight suites and 130 tests, covering the
role-visibility filters, the team route roles and membership rules, who may
invite whom into which team, what accepting an invitation creates, the time-log
write scope, the user-list scope and the project assignment scope. Most run against a real database; the team
route suite runs the real guard, and the invitation authorisation suite is pure
logic. Nothing else is covered, but GitHub Actions runs them on every
pull request, alongside lint, typecheck and build for both applications.

The backend has a production image (`apps/backend/Dockerfile`) and migrations
run as a deployment step. The frontend has no image on purpose — it is built by
its host. A shared development stand is deployed on Vercel, Render and Neon; there
is no production environment yet.

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
- **Nobody** approves anybody's timesheet. Someone else's time can be corrected
  by their manager or by the owner, inside an open period, and never by anyone
  else (D9).

### Roadmap

High-level and ordered by dependency. Each phase is a coherent product increment,
not a task list. Phases 0 and 1 are delivered; Phase 2 is the next product
phase, after Scope E of [`permission-model.md`](./permission-model.md) §7.

---

**Phase 0 — Close the authorization gaps — delivered**

Two gaps leaked data across roles: the project read routes exposed the company
roster with email addresses to every employee, and planned-vs-actual handed
managers company-wide figures. Everything later builds on these code paths, so
they were fixed first.

Delivered: OWNER/MANAGER role guards on the project read routes, the member
roster trimmed out of the project list response, `applyUserVisibility` on both
planned-vs-actual aggregates, and `/admin/*` guarded on the middleware and in
every page through `requireManagerAccess()`.

It was also where the **first tests** landed. The role-visibility filters were
the highest-value thing to test in the codebase — security logic, about to gain
a second consumer, and pure query construction that tests well.

*Depended on: nothing. Blocked: everything, in practice.*

---

**Phase 1 — Manager and owner team time view — delivered**

The largest missing piece of product value, and the cheapest large feature
available, because the authorization work already existed.

Owners and managers now land on `/team` and read a team week: people down the
side, days across the top, totals in the cells, filterable by team and project,
with a drill-down into one person's entries, editable by the owner and by the
manager of that person's team (D9).

**Expected hours are shown as neutral context, not as a warning.** Nothing is
styled as under target, because absences do not exist yet and
`capacityHoursPerWeek` is unread, so the signal would fire on people who are not
actually short. Phases 2 and 3 are what make it trustworthy.

Three constraints that mattered more than the UI, and still hold:

- **The summary must reuse the existing visibility filter.** A hand-written
  second copy of the manager/team SQL is exactly how authorization bugs get
  introduced. The summary and the list must never be able to disagree about who
  a manager may see.
- **Aggregate in the database, not the browser.** Summing raw logs client-side
  works for one person's week and will not survive the whole company.
- **Editing someone else's time is a server-side permission.** The check belongs
  in the time-log service, next to the period lock and the ownership match, and
  the same visibility source has to decide it. A hidden edit button is not a
  permission.

It also closed the blank home page, added the missing timesheet link for
managers, and narrowed the user and team lists to a manager's own teams (D10).
Assignment kept its own company-wide list until Scope E narrowed that too.

*Depended on: Phase 0. Blocks: Phases 3 and 5 have their natural home here.*

---

> Before Phase 2, the permission scopes in
> [`permission-model.md`](./permission-model.md) §7 close the authorization gaps
> listed in §6. Scopes C and D are delivered; **Scope E is in progress**, and it
> is the last of them that closes a gap.

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

Meaningful test coverage beyond Phase 0's start; a sane access-token lifetime
(one minute drops sessions during ordinary use); reminders for people who have
not logged their week, if wanted (§10 Q5); and the accessibility items listed as
TODOs in the frontend documentation. CI and the frontend admin role check were
both pulled forward and are done.

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

1. **A time log is written only by the person it belongs to, by a manager of a
   team that person is in, or by an owner** (D9) — enforced in the service,
   never by the UI alone.
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
   with `leftAt` rather than deleting the row, and archiving a person changes
   neither their team memberships nor their project memberships — active status
   gates joining, not staying. Only a deliberate removal ever takes someone off
   a team or a project.
7. **Aggregate in the database.** Client-side summing does not survive company
   scale.

---

## 9. Documentation map

| Document | Covers |
| :--- | :--- |
| **This document** | Product definition, business rules, decisions, roadmap |
| [`permission-model.md`](./permission-model.md) | Target permission model and the scopes that deliver it; §5 says which parts are built |
| [`current-scope.md`](./current-scope.md) | The one scope being built now, in English and Ukrainian |
| [`known-issues.md`](./known-issues.md) | Defects and debt that no current scope owns |
| [`architecture.md`](./architecture.md) | System shape, request flow, where to start |
| [`backend-context.md`](../apps/backend/docs/backend-context.md) | Modules, API surface, data model, constraints |
| [`auth.md`](../apps/backend/docs/auth.md) | Tokens, sessions, guards, OAuth, password flows |
| [`frontend-context.md`](../apps/frontend/docs/frontend-context.md) | Routing, data layer, design tokens, components |
| [`workflow.md`](./workflow.md) | Branching, pull requests, CI, migrations, deployment |
| [`README.md`](../README.md) | Setup, commands, environment |
| [`CLAUDE.md`](../CLAUDE.md) | Coding conventions and workflow rules |

---

## 10. Open decisions

Questions about the permission model — team membership, invitations, project
responsibility — live in [`permission-model.md`](./permission-model.md) §6,
alongside the model they belong to. The ones below are about the rest of the
product.

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

**Q3 — Should managers administer company-wide resources? — answered for teams,
still open for the rest.**
The team half is settled and built: the Owner creates teams and appoints their
managers, and a manager operates the team they lead. Projects are settled the
other way — they stay company-wide, because a project spans teams and narrowing
it by team would be wrong by construction. User management stays OWNER-only.

What remains genuinely open is **activities and categories**, which are company
lookup tables any manager can still edit or archive across the whole company.
*Recommendation: leave them company-wide for now* and revisit if two managers
ever disagree about the catalogue.

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

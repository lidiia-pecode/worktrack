# WorkTrack — Product & Business Reference

The single reference for **what WorkTrack is, how its business rules behave
today, what it should become, and in what order to get there.**

Companion documents describe *how* things are built:
[`architecture.md`](./architecture.md) for the system shape, and — in a local
checkout only, since they are kept outside version control — context notes for
the backend modules and API surface, for sessions and authentication, and for
the UI layer. This document does not repeat them; it explains the product those
pieces serve.

**Status of this document.** Sections 1–6 describe behaviour verified against
the current code and are authoritative. Sections 7–9 describe agreed direction
and are the basis for planning work. Section 10 lists decisions that are still
genuinely open.

**Last verified against the code: 24 September 2026**, and reconciled again
with Phase 8. Phases 0 to 8 of the roadmap in §7 are delivered, as are Scopes C,
D and E of [`permission-model.md`](./permission-model.md) §7 — Scope E closed
the last of the authorization gaps in §6, and the permission model is complete.
The remaining work was re-planned after Phase 5 into Phases 6–13 and a final
production launch stage (§7); the next is Phase 9, engineering quality and
tooling.

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

*Consequence.* A period is a calendar month, and it locks by itself 7 days
after it ends; an owner can reopen one. It is enforced on every write. Note the
flow:
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

**Built in September 2026 as Phase 2.** `Absence` is its own table with a date
range, a fixed type and an owner; an `Activity.isAbsence` flag that contradicted
this decision was removed with it. The rules that came out of building it are in
§7 Phase 2.

### D7 — No money in WorkTrack

No rates, no revenue, no cost, no margin.

*Why.* Invoicing is handled externally. Rates would also bring genuine
complexity — a rate change must not retroactively rewrite last quarter's figures,
which means effective-dated rates — and cost data would put salary-grade
information into the app.

*Consequence.* `Company.currency` has no consumer and should not acquire one.
Reporting deals in hours. The handoff to invoicing is an **export of hours**, not
a monetary figure (see §7 Phase 13).

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
[`permission-model.md`](./permission-model.md) §3.4 and §3.5.

**D10 therefore has no exceptions, and is not expected to gain any.** A manager
sees the people in the teams they lead, on every list in the product. A
project-level **responsible person** was considered as the one deliberate
exception and rejected in September 2026: responsibility in WorkTrack runs
through teams, so there is nobody to name. See
[`permission-model.md`](./permission-model.md) §3.6.

---

## 3. Domain model

Verified against the entities in `apps/backend/src/*/entities/`, which remain
the source for columns, indexes and constraints.

```text
Company  (tenant root — everything below carries companyId)
│
├── User            role: OWNER | MANAGER | EMPLOYEE
│                   status: ACTIVE | DEACTIVATED
│
├── UserCapacity    user + validFrom + minutesPerWeek + createdBy
│                   contracted hours, effective from a date
│
├── Team ──< TeamMembership >── User
│                   roleInTeam: MEMBER | MANAGER
│                   time-bounded: joinedAt / leftAt
│
├── Invitation      email + role + status (PENDING | ACCEPTED | REVOKED)
│                   teamId (the team it is for) + invitedById (who sent it)
│
├── ActCategory ──< Activity          defaultBillable
│
├── Project  (clientName: free text)
│     ├──< ProjectActivity >── Activity     which activities are allowed here
│     └──< project_users    >── User        who may log against this project
│
├── Absence         user + type + startDate + endDate + note
│                   type: VACATION | SICK_LEAVE | PUBLIC_HOLIDAY
│
├── TimeLog         user + projectActivity + date + minutes + isBillable
├── PlanningEntry   user + project + date + plannedMinutes + createdBy
└── ReportingPeriod month + status (OPEN | LOCKED) + changedBy
                    only for months an owner has reopened
```

**The pivotal join is `ProjectActivity`.** Time is never logged against a
project or an activity alone — always against a specific *activity enabled on a
specific project*. This is what makes "Development on Client X's redesign"
distinguishable from "Development on our internal tooling".

**Planning is the exception, deliberately.** A `PlanningEntry` names a project
and nothing finer: the activity is chosen when the time is actually logged.
Planning says which project, the time log says what work.

**A user belongs to exactly one company.** Email and `googleId` are globally
unique. The same person working at two companies would need two accounts with
different email addresses. There is no shared identity spanning companies —
consistent with §1's position on multi-company.

**Team membership is historical, not current-state.** Rows are closed with
`leftAt` rather than deleted, so "who was on this team in March" remains
answerable. `leftAt` is the day a membership ended, not its last day, so somebody
can leave a team and rejoin it on the same day, and membership dates are the
company's dates, from its time zone. Managership is derived from membership: a manager sees people who
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

### Absences

An absence is a date range belonging to one person, with a type — vacation, sick
leave or public holiday — and an optional note. It is never a time entry and
never appears in an hours total (D6).

Every write passes three checks:

1. **Write scope** — the same rule as time logs, through the same
   `assertCanActForUser` helper: an owner records for anyone in the company, a
   manager for the people in the teams they lead, an employee for themselves.
2. **Period lock** — a range touching a `LOCKED` period cannot be created,
   changed or deleted, and neither can it be moved into one.
3. **The day is free** — no day of the range may already have logged time, and
   no day may already be covered by another absence, whatever its type.

The rule runs both ways: time logging is refused on a day an absence covers.
Each service reads the other's table directly rather than depending on it, and
both check inside the transaction that locks the owner's user row, which is what
stops two concurrent writes from each seeing a free day.

A range is refused whole rather than partially, and the refusal names the
conflicting dates. The database backs the range up with a check constraint that
`endDate >= startDate`.

**A public holiday belongs to a person, not the company.** Whether somebody
takes it or works it is their own record to make, so there is no company-wide
holiday calendar and nothing tells a person which days are holidays.

### The invariant worth internalising

> **Write access for a time entry matches read visibility: owners company-wide,
> managers within the teams they lead, employees themselves.**

This is enforced in the service, and the caller is kept distinct from the
entry's owner throughout the write path — the daily ceiling, the project
membership and the row lock all follow the owner. A time entry now means "this
person, or someone answerable for them, says this work happened".

### Planning

A `PlanningEntry` is company + target user + **project** + date + planned
minutes, recording who created it. Unique on
`(companyId, userId, projectId, date)` — one row is one person, one project, one
day, so one day can hold several projects. Writes take the same pessimistic
user-row lock as time logs.

An OWNER may plan for any ACTIVE user in the company; a MANAGER for themselves
and users in teams they manage. Employees cannot write planning at all. Everyone
can read their own plan.

Every write is checked on the server:

1. The person must be a member of the project.
2. Only Monday to Friday can be planned.
3. Nothing inside a LOCKED period can be created, changed or deleted.
4. An entry on an archived project can only be deleted.
5. A day may not rise above `Company.standardWorkHoursPerDay`, and a week — as
   set by `Company.weekStartDay` — above the person's **available** hours
   (capacity minus absences). Both refuse only a write that *raises* a total, so
   a week left over budget by a later absence or capacity change can always be
   reduced.

An update re-runs rules 1, 2 and 5 whenever it changes the date, project or
minutes. An absence never blocks planning and never changes a plan.

**Removing somebody from a project deletes their plans for it from today
onwards**, in the company's time zone, never on a locked date; past plans stay
for planned-vs-actual. Both membership screens confirm first, naming the count
from `GET /planning/removal-count`, which uses the same condition as the delete.
Archiving a project deletes nothing.

Planning does **not** create time logs, does not restrict them, and never
changes expected hours (D3).

### Capacity and expected hours

Four words carry this, and they mean the same thing in the API, the interface
and this document:

| Word | What it means | How it is worked out |
| :--- | :--- | :--- |
| **Expected** | How much somebody was supposed to work | capacity, minus the days they were away |
| **Planned** | What a manager committed them to, by project | the planning entries for those days |
| **Logged** | What actually happened | the time logs for those days |
| **Behind** | They logged less than expected | logged < expected, over finished days only |

**Capacity** is a `UserCapacity` row: contracted minutes per week with the date
it takes effect, unique on `(companyId, userId, validFrom)`. The row in force on
a date is the last one starting on or before it; with no row at all, the company
default `standardWorkHoursPerDay × 5` applies, so an ordinary full-time company
keeps an empty table. A change is a new row rather than an edit, which is what
stops a contract change rewriting weeks somebody has already worked.

**Expected** is computed in one place, `ExpectedHoursService`: every Monday-to-
Friday day in the range that no absence covers, each contributing a fifth of the
capacity in force that day, summed and rounded once at the end. Rounding once is
what keeps a full week away at exactly zero and a full week present at exactly
that person's capacity, for a part-timer as well as a full-timer. It returns two
figures — `total` for the whole range, and `toDate` counting only days that have
finished in the company's timezone, which is what **behind** is measured against.

**Expected never consults planning, and planning never changes expected** (D3).
Somebody with no plan at all has the same expectation as anybody else.

An OWNER sets capacity from the user form. A change may not take effect on or
before the last locked day — both dating one inside a LOCKED period and
backdating one to before it are refused, since either would alter what was
expected inside a month already signed off.

### Period locking

A reporting period is a calendar month. It stays editable for 7 days after it
ends and **locks by itself on the 8th day**, in the company's time zone —
January locks on 8 February. The lock is worked out from the date whenever it is
checked, so nothing has to run on schedule and nobody creates periods. Months
never share a day.

An OWNER can **reopen** a locked month, and it stays open until they close it
again; a month still inside its grace window cannot be reopened or closed. Each
reopened month is one `ReportingPeriod` row — `OPEN` while reopened, `LOCKED`
once closed again, with who changed it last. No row means the automatic rule.
`isDateLocked` backs the check in rule 1 above.

**Planning follows locked periods like time logs**, so a plan stays
correctable until its period is locked, and planned-vs-actual becomes final on
both sides at the same moment.

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
lead. An employee invitation always names a team, and creating an employee
directly does too. Accepting an invitation that carries a team creates the team
membership, always as a `MEMBER`, in the same transaction that creates the user.
Invitation tokens are stored hashed and are `PENDING | ACCEPTED | REVOKED`.

A failed invitation email leaves no invitation behind. Pending invitations can be
listed, resent and revoked — by the owner for the whole company, by a manager for
those into the teams they lead. A resend issues a new link and the old one stops
working, and sending and resending are each limited per session. Archiving a team
revokes its pending invitations.

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
| Invitations | create, any role, an employee always into a team; list, resend and revoke any pending one | create, EMPLOYEE only, always into a team they lead; list, resend and revoke those into teams they lead | — |
| Teams | full CRUD | read, within their teams; remove a member | — |
| Projects | full CRUD | full CRUD | only their own, through `GET /projects/me/activities` |
| Activities, Categories | full CRUD | full CRUD | read |
| Time logs — read | whole company | users in teams they manage | own only |
| Time logs — write | whole company | own, plus users in teams they manage | **own only** |
| Planning — read | whole company | own, plus users in teams they manage | own only |
| Planning — write | any active user | self + managed users | — |
| Reporting periods | reopen + close | read | read |

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
  cookies, rotating refresh tokens that survive concurrent refreshes, password
  reset, changing or setting your own password, invitation-based signup. Rate
  limits count signed-in traffic per session and sign-in attempts per account.
- **Employee timesheet** — the most complete feature and the best reference for
  frontend conventions. Log, edit and delete time against assigned projects,
  driven by company work settings, with loading, error, empty and over-target
  states.
- **Admin CRUD** — users, teams, projects, activities and categories.
- **Team time view** — owners and managers land on `/team`, read their people's
  week filtered by team and project, and open any row to see that person's
  entries day by day and correct them.
- **Absences** — a person records their own days away as a date range with a
  type, from the timesheet; the timesheet and the team grid mark those days, so
  an empty week explains itself. A day is either worked or absent, never both.
- **Capacity and expected hours** — an owner sets somebody's contracted hours
  from a date; both week views read one backend figure for what was expected,
  absences reduce it, and a person is marked behind once a day has finished.
- **Planning** — owners and managers plan their people's week by project on
  `/planning`, see planned against available hours and which weeks no longer
  fit; everyone sees their own plan on the timesheet until they log time that
  day.
- **Closing periods** — each month locks by itself 7 days after it ends, and an
  owner can reopen a locked month from `/admin/periods` and close it again. The
  timesheet, team grid and planning grid show locked days as read-only, and
  during the grace week the timesheet says until when last month can be edited.
- **Hours report** — owners and managers see logged time on `/reports` for a
  month or a custom range of up to 366 days, grouped by client, project, activity or person, and
  split into billable client work, non-billable client work and internal work
  (D2). A range that includes a month still open to edits is marked
  provisional. Managers see only the teams they lead. A second tab compares
  planned with logged time per person for the same range, shown as a neutral
  difference rather than a score (D3). A third shows utilisation per person —
  billable utilisation, client share, non-billable client share and logging
  completeness, each labelled with what it is measured against and shown as
  "—" when there is nothing to measure. Availability and logged time both count
  only days that have finished.
- **Manager scope** — a manager's user, team and time lists all narrow to the
  teams they actively lead, and so does the list they staff from, plus
  themselves.
- **Onboarding** — setup-state endpoints tell a new workspace what it still has
  to configure, and a wizard renders from them.

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
cross-cutting hours by client and project are the hours report, built in
Phase 5.

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

### Scope E delivered

`syncProjectUsers` takes the caller and refuses anyone outside the people they
manage, `GET /users/assignable` returns that same set plus the caller
themselves, and a manager's save only adds and removes inside it. A project's
member list is scoped the same way and narrowed to identity fields, while the
project still reports its true size, so a scoped list does not make a staffed
project look empty. Managers and owners may be project members, so a manager
finally has something to log against. And active status gates joining rather
than staying, so archiving a person neither errors nor drops their membership.

**This closed the last of the authorization gaps in §6.** What a manager may
see and change is now one rule everywhere: the people in the teams they lead,
plus themselves.

### Fields that exist but do nothing

| Field | Status |
| :--- | :--- |
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

4. **Project membership is assigned without a visibility check — closed.**
   `syncProjectUsers` takes the caller and refuses anyone outside the people
   they manage, and the diff only removes inside that set, so a manager cannot
   drop someone else's person by submitting a list that never contained them.
   "May be newly assigned" and "may remain assigned" are now separate checks:
   only an addition is tested for active status, so archiving a person neither
   errors nor drops their membership.

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

**Every gap on this list is closed.** Scope E closed the last three.

**Closed since this section was written.** The project read routes
(`GET /projects`, `GET /projects/:id`, `GET /projects/:id/users`) used to filter
on `companyId` only, letting any employee enumerate every project with its full
roster. They now carry an OWNER/MANAGER role guard. `/admin/*` was added to the
middleware's guarded prefix list, so an unauthenticated visitor is redirected to
login, and every `/admin/*` page and `/team` now calls `requireManagerAccess()`,
so an employee who navigates there is sent back to their own timesheet instead
of rendering an admin screen the backend would refuse to fill.

### Engineering state

Backend test coverage is twenty-five suites and 397 tests, covering the
role-visibility filters, team and invitation rules, time-log, absence, capacity
and planning rules, monthly locking in and outside UTC, the three reports, page and date-range
limits, name checks, and session refresh, rate limits and token clean-up — most
against a real
database. The frontend has Vitest tests for its date, month, absence, lock and
paging helpers, which CI does not run yet. GitHub Actions runs the backend suites,
lint, typecheck and build for both applications on every pull request, but does
not check formatting and allows lint warnings. The nightly clean-up of
expired sessions and used one-time tokens runs only while the backend is awake,
which on the free development stand is not every night.

The backend has a production image (`apps/backend/Dockerfile`); the frontend is
built by its host. A shared development stand runs on Vercel, Render and Neon on
free plans, with migrations applied by hand; there is no production environment
yet.

Access tokens live fifteen minutes and refresh tokens thirty days. A page holds
at most 100 rows and a larger request is refused; views that need a whole list
fetch it page by page.

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
not a task list. Phases 0 to 8 are delivered, and so is every permission
scope in [`permission-model.md`](./permission-model.md) §7. Phases 6–13 and the
final stage were re-planned in September 2026, after Phase 5 closed.

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
styled as under target, because the figure is not yet true: it counts every
weekday against a company-wide 8-hour day, so the signal would fire on part-time
staff and on anyone who was away. Absences arrived with Phase 2 but do not yet
reduce the expectation; Phase 3 is what makes it trustworthy.

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
> [`permission-model.md`](./permission-model.md) §7 closed the authorization gaps
> listed in §6. Scopes C, D and E are delivered and §6 has no open gaps left. A
> fourth scope, project responsibility, was cancelled rather than built.

**Phase 2 — Absences — delivered**

Implements D6. `Absence` is its own table, separate from `TimeLog`, covering a
**date range** with a type, so a two-week holiday is one row rather than
fourteen. A person records their own from the timesheet; the timesheet and the
team week grid mark the days, so a week with no logged time reads as "on
holiday" rather than "did not log". `Activity.isAbsence` was removed with it.

Six business decisions were settled while building it, and they are the rules
now in force:

- **Who may record for whom** follows the time-log scope exactly (D9), through
  the same `assertCanActForUser` helper rather than a second copy of the rule.
- **Absences respect period locking** across their whole range (§10 Q1).
- **Three fixed types** — vacation, sick leave, public holiday — as a database
  enum, not a per-company lookup table.
- **A public holiday is personal.** It belongs to one person like any other
  absence, because a holiday is not automatically a day off and somebody may
  work it. There is therefore **no company holiday calendar**, and nothing tells
  a person which days those are.
- **Whole days only.** No half-days, no hours.
- **A day is either worked or absent, never both.** An absence touching a day
  with logged time is refused, and logged time on a covered day is refused;
  two absences may never overlap. The cost, accepted deliberately: *worked half
  a day, then went home sick* cannot be recorded without deleting the time log.

Deliberately excluded, and still excluded: requests, approvals, balances,
accrual. Leave management lives elsewhere (§1). WorkTrack records that the
absence happened.

Not built, and known: a manager cannot record an absence for someone in their
team through the UI, though the API allows it and enforces the scope.

*Depended on: Phase 1 for the surfaces. Blocks: Phase 3 — expected hours cannot
be right until absences are known.*

---

**Phase 3 — Capacity and expected hours — delivered**

**Built in September 2026.** The expected figure on both week views was
`standardWorkHoursPerDay` times every weekday, so part-time staff were measured
against hours nobody agreed with them and a week of holiday read as forty hours
short. It is now capacity minus absences, computed once in the backend. §4
describes the rules that are in force; what follows is what settling them cost.

**Capacity became a record rather than a column.** `UserCapacity` carries
contracted minutes per week with the date they take effect, and the row in force
on a date is the last one starting on or before it. A single mutable number on
`User` could not work: editing it would recompute every week the person had
already worked, which is the instability Q1 rejected for absences.
`User.capacityHoursPerWeek`, which no screen ever set, was removed with the same
migration and its value carried into a row where it was not the default.

**The vocabulary was the other half of the work.** Expected, Planned, Logged and
Behind now mean one thing each, everywhere, and the interface says *Expected*
where it used to say *Target*. One progress bar shows one comparison; Expected
and Planned never share a bar, and Planned is not shown to employees at all.

**Planning entries moved from a project activity to a project**, which is what
makes one row one project in one person's day on the grid Phase 4 draws.

Five decisions came out of building it, and they are the rules now in force:

- **Capacity is set by the OWNER**, in the user form — contracted hours are an
  employment fact, and D10 keeps user administration with the owner.
- **A capacity change may not take effect on or before the last locked day.**
  Dating one inside a LOCKED period is refused, and so is backdating one to
  before it, since either would alter what was expected in a closed month.
- **Expected never consults planning** (D3), so the phase was safe to ship
  before a planning interface existed.
- **Behind counts only days that have finished**, in the company's timezone.
- **A public holiday reduces the expectation only for whoever recorded one**,
  following Phase 2.

Four limitations were accepted rather than solved, and they are listed in
`known-issues.md` rather than repeated here: the evenly-spread working week, the
hardcoded Monday-to-Friday days, the unversioned company default, and the loss
of billable forecasting on planned work.

*Depended on: Phases 1 and 2. Blocks: Phase 5's utilisation figures.*

---

**Phase 4 — Planning interface — delivered**

**Built in September 2026.** The planning module had full CRUD since Phase 0 and
no screen. Managers now plan per person, **per project**, per weekday, one week
at a time, and employees see their own plan read-only as context (D3). §4
describes the rules in force.

**What settling them cost.** Three earlier assumptions were reversed. Planning
now requires project membership (§10 Q2, answered: block). The weekly budget is
*available* hours rather than contracted capacity, so a holiday booked in advance
is caught at planning time. And past plans follow locked periods rather than
freezing at today, so a plan can be corrected after a late sick day until the
month is closed. The limits refuse only increases, because an absence recorded
after the plan was made would otherwise leave a week nobody could reduce.

Two manager-only figures came with it: **unplanned capacity** (available minus
planned) and **no longer fits** (planned above available, flagged and never
fixed automatically). Neither is shown to an employee, and neither affects
whether somebody is behind.

*Depended on: Phase 1 for navigation and the team context. Blocks: the
planned-vs-actual half of Phase 5.*

---

**Phase 5 — Reporting and closing periods — delivered**

**Built in September 2026.** Period locking was enforced on every write but
could not be switched on, and none of the data came back out as an answer. Now
months close by themselves and owners and managers have a `/reports` page. §4
and §5 describe what is in force; what follows is what settling it cost.

**Periods became calendar months that lock by themselves.** Free-form named
periods were dropped. A month stays editable for 7 days after it ends and locks
on the 8th in the company's time zone, worked out from the date whenever it is
checked — a scheduled job was rejected because the backend sleeps when idle. An
owner can reopen a locked month and close it again; nothing closes a month
early. Every month already past its grace window locked the day this shipped.

**The hours report keeps D2's three categories apart under any grouping.**
Rather than treating internal work as one group, every row splits into billable
client work, non-billable client work and internal work, grouped by client,
project, activity or person. Client names that differ only in case count as one
client.

**Utilisation settled on four figures** — billable utilisation, client share,
non-billable client share and logging completeness — reading capacity and
absences separately and counting availability and logged time only for days
that have finished, so a month in progress is not measured against days still
to come. Billable over
*capacity* was left out as unfair per person.

**Names keep their case.** Project, client, activity, category and team names
are trimmed rather than lowercased; team names became unique regardless of case,
like the others.

Reports are for owners and managers only. Planned vs actual stays readable
through the API by employees for their own figures, but no employee screen
shows it; a report of an employee's own hours is a possible later addition.
Export moved behind the polish phases (Phase 13). The limitations accepted
along the way: a fixed seven-day grace period, no closing a month early, client
names that stay free text, and names saved before Phase 5 staying lowercase
until edited.

*Depended on: Phases 3 and 4.*

---

**What comes after Phase 5.** Everything the product was meant to do is now
built except export. What remains is making it correct, safe and pleasant to
rely on, then getting hours out, then going live. The old single "hardening"
phase mixed bugs, security, tests, polish and accessibility; it is split below
by area, so that each phase is one branch and one pull request, can be reviewed
on its own, and ships something a person would notice. Every phase adds the
tests for what it changes — there is no separate "write the tests later" phase.

**Ordering.** Correctness and security first, because they are the things that
cannot wait for real use: people losing their session, a password that cannot
be changed, an invitation that blocks its own retry. Then the limits that keep
figures right as data grows, then the tooling that protects everything after
it and a development environment that can be trusted. Visual polish and accessibility come once the behaviour underneath has
stopped moving. Export stays after them by decision, so the file reflects
settled screens; production launch closes the roadmap because it depends on
decisions about hosting and domain rather than on code.

---

**Phase 6 — Sign-in, sessions and account security — delivered**

**Built in September 2026.** People were signed out during ordinary use, the
password form did nothing, and the rate limits either limited nothing or limited
everybody at once. Now a session lasts as long as it should, the limits count
people, and a person can change their own password. No permission changed and no
feature was added.

**Sessions stopped dropping.** Refreshes arriving together — a navigation and
its prefetches, a second tab — made the backend treat the third as a stolen
token and delete the session. A refresh that brings the token rotated away in
the last thirty seconds now gets a new access token and leaves the session
alone; any other reuse still ends it. The access token lives fifteen minutes
(Q7).

**Limits count people, not the proxy.** The global limit is a real per-minute
limit. Signed-in traffic is counted per session, read from a verified token, so
the frontend's server counts as the many people it carries. Sign-in, sign-up and
the password routes are also limited per account, from any address. Measured on
the development stand, the address the backend sees for a client is a
Cloudflare server rather than the person, so `TRUST_PROXY_HOPS` stayed at one
and the per-account limit is what protects an account.

**Changing your own password works**, both "Change password" and "Set password"
for an account created with Google. Mistakes show on the field they belong to,
and a change signs out the person's other devices.

**Housekeeping.** The nightly clean-up also deletes used or expired one-time
tokens, dead token code went, and the shared Google callbacks are recorded as
intended: the outcome depends on the account, not on the button pressed.

The limitations accepted along the way: the per-client sign-in limit is shared
by everyone behind the same Cloudflare server, a throttled refresh still signs
the person out, the clean-up runs only while the backend is awake, and there is
still no list of your own sessions.

*Depended on: nothing. Q7 and Q8 were answered while planning it.*

---

**Phase 7 — Invitations and team membership — delivered**

**Built in September 2026.** Adding people mostly worked but failed at the
edges: a failed email blocked the address for a day, a sent invitation could not
be followed up, an employee could join with no team, and membership dates
followed the server's clock. Now inviting and staffing is reliable, recoverable
and says what happened. No permission changed.

**Invitations can be recovered.** A failed invitation email leaves nothing
behind, so the address can be invited again at once. Pending invitations are
listed on the users page with resend and revoke — the owner sees all of them, a
manager those into the teams they lead, including ones the owner sent there
(D10). A resend issues a new link and expiry, and the old link stops working.
Sending and resending are each limited to 20 a minute per session.

**Every employee joins into a team.** An employee invitation names an active
team, from the owner too, and so does creating an employee directly. Archiving a
team revokes its pending invitations and tells the owner how many. An employee
can still be left without a team after removal from their last one; only the
owner sees and places them.

**Membership dates are right.** `leftAt` is the day a membership ended, not its
last day, so somebody can be removed and added back the same day. Membership
dates come from the company's time zone, not the server's.

**The flow says what happened.** The invitation page names the team, and a
manager whose teams are all archived is told so. A team outside a manager's
scope gets the same error whatever its state, and the manager onboarding check
counts only the manager's own teams.

The limitations accepted along the way: invitations sent without a team before
this phase are accepted as they are and the owner places the person, and an
employee left without a team is not flagged.

*Depended on: nothing. Its business questions were answered while planning it.*

---

**Phase 8 — Data limits and robustness — delivered**

**Built in September 2026.** Lists and reports worked on small data but gave
wrong answers at the edges: several views asked for 500 rows and showed whatever
came back, the backend accepted any page size and any date range, and a name
containing `_` or `%` could be refused as a duplicate of a different name. Now
every list and report stays correct as data grows. No permission changed and no
feature was added.

**No list is cut off.** A page holds at most 100 rows, and a request for more,
or for a page or page size below 1, is refused rather than shortened. Every view
that needs a whole list — the timesheet, the team grid and its person panel, the
planning grid, the activity picker, team options and the team filters' projects —
fetches it page by page, and the lists they page through keep a fixed order, so
no row is repeated or skipped. List responses carry the rows and their total;
the pagination links, built from the backend's own host and read by nothing,
are gone.

**Date ranges are bounded.** The hours, planned vs actual and utilisation
reports, expected hours and the team week summary cover at most 366 days,
counting both ends. The custom range picker on the reports page applies the same
limit and refuses a year that is not four digits, with a message under the field
instead of a request.

**Names are compared exactly.** The duplicate-name checks for projects,
activities and categories compare names the way the database's unique indexes
do, ignoring case and surrounding spaces, so `_` and `%` are plain characters.
Activity names stay unique across the company.

The limitation accepted along the way: a view that needs a whole list makes one
request per 100 rows.

*Depended on: nothing. Its decisions were settled while planning it.*

---

**Phase 9 — Engineering quality and tooling**

The codebase stays safe to change: stricter CI, a frontend test harness, and
the duplications and gaps found during Phases 3–8 closed.

- **CI enforces formatting and zero lint warnings**, after the remaining warnings
  are fixed.
- **The frontend gets a test harness** and first tests for the date, month and
  lock logic the week views and reports depend on.
- **Locking is tested outside UTC** and end to end through each write path.
- **One source for the company's today**, replacing the copies in capacity,
  reporting and team membership, and the unused token constants removed.
- **Every load-more list keeps a fixed order.** The users list, the assignable
  users and a project's members can tie on creation time or name, so paging
  through them could repeat or skip somebody.

*Depends on: nothing. No business questions.*

---

**Phase 10 — Development environment**

The local stack and the shared development stand can be trusted: what a
developer sees is what the code says.

- **Dev containers pick up file changes** — new, renamed and deleted files reach
  the backend and frontend watchers, and a stale Next.js cache no longer
  survives a restart unnoticed.
- **Setup is verified from a clean clone**, using only the README and the
  `.env.sample` files.
- **The hosted database URL says `sslmode=verify-full`** explicitly, instead of
  relying on how `pg` reads `require` today.

*Depends on: nothing; after Phase 9 so its CI is in place. No business
questions.*

---

**Phase 11 — Week views and reports polish**

The screens built in Phases 1–5 behave smoothly and consistently.

- **A manager who leads no team sees their own row** on the planning grid.
- **Locked days never look editable**, not even while the week is loading, and an
  absence that touches a locked month does not open for editing.
- **Owners can reach any month to reopen**, not only the last twelve.
- **Durations read naturally** ("30m", "−30m"), and the report filters keep their
  layout when a date is invalid.
- **Small inconsistencies are gone**: the product is spelled WorkTrack everywhere,
  an invalid spacing class is replaced, unused requests are dropped, and the
  user modal refreshes its project list after a change.

*Depends on: Phase 9's test harness is useful but not required. No business
questions.*

---

**Phase 12 — Accessibility**

WorkTrack is usable by keyboard and screen reader and meets AA contrast.

- **Every control has a name and state**: the week navigation arrows, the
  calendar toggle, and focusable entries on locked days.
- **Contrast meets AA** for the neutral badge and warning text on tinted
  backgrounds, fixed in the visual foundation rather than per component.
- **Tab lists follow the keyboard pattern people expect** — arrow keys move
  between tabs on the reports and admin pages, not only Tab.

*Depends on: Phase 11, so the screens are settled first. No business
questions.*

---

**Phase 13 — Export**

Because invoicing happens outside WorkTrack (D7), someone has to get hours
*out*. This is a functional requirement, not a nice-to-have — without it the
billable/non-billable distinction has no consumer. It comes after the polish
phases by decision, so the file reflects screens and figures that have stopped
changing.

Anybody who can see a report may export exactly the data they can see — an
owner the whole company, a manager the teams they lead.

*Depends on: Phases 5 and 11. Open: §10 Q4 (format and grouping).*

---

**Final stage — Production launch**

WorkTrack runs as a real production service, separate from the shared
development stand.

- **A production environment** — a second copy of the frontend and backend on
  paid plans, a fresh database, and the company's own domain with its Google
  sign-in URLs registered. Nothing is copied from the stand.
- **Migrations as a real release step**, replacing the hand-run step from a
  laptop, which the free tier forces today.
- **A release checklist**: environment variables, rollback, and the first
  deployment verified the way the stand's were.

*Depends on: Phase 13, and on §10 Q9 (hosting, domain and timing), which is a
business decision rather than code.*

---

**Deferred on purpose.** Not scheduled, each waiting for a decision or a real
need: a `Client` entity (D8); reminders for incomplete weeks (§10 Q5); a report
of an employee's own hours; a dark theme; per-person working patterns, a
configurable working week, a versioned company default capacity, a configurable
grace period and closing a month early; and the permission questions in
[`permission-model.md`](./permission-model.md) §6.

---

### Dependency summary

```text
Phases 0–8  delivered
   │
   ├── Phase 9   Engineering quality and tooling ────────┐
   │                                                     │
   ├── Phase 10  Development environment                 │
   │                                                     │
   ├── Phase 11  Week views and reports polish           │
   │      │                                              │
   │   Phase 12  Accessibility                           │
   │      │                                              │
   └── Phase 13  Export  ◄───────────────────────────────┘
          │
   Final stage   Production launch
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
| [`permission-model.md`](./permission-model.md) | The permission model and the scopes that delivered it; §5 says which parts are built |
| [`architecture.md`](./architecture.md) | System shape, request flow, where to start |
| [`workflow.md`](./workflow.md) | Branching, pull requests, CI, migrations, deployment |
| [`README.md`](../README.md) | Setup, commands, environment |

Alongside these, a local checkout also carries working documents that are
deliberately not version-controlled: the active scope, the list of defects and
debt no scope owns, context notes for the backend and the frontend, and the
repository's coding conventions. They are named here rather than linked, because
they are not part of the published documentation.

---

## 10. Open decisions

Questions about the permission model — team membership, invitations, team
structure — live in [`permission-model.md`](./permission-model.md) §6, alongside
the model they belong to. The ones below are about the rest of the product.

Genuinely undecided. Each includes a recommendation, but none should be treated
as settled until confirmed.

**Q1 — Do absences respect period locking? — answered.**
Yes. Confirmed in September 2026 and built with Phase 2: an absence cannot be
created, changed or deleted once any day of its range falls in a locked period.
The reasoning was that Phase 3 makes absence an input to expected hours, so
editing one in a closed month would silently change whether somebody was short
that month — exactly the instability D5 exists to prevent.

**Q2 — Should planning require project membership? — answered.**
Yes, block. Confirmed in September 2026 for Phase 4. Time logging requires a
`project_users` row, and a plan for a project the person cannot log against is
impossible to fulfil. Staffing comes first, then planning.

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
Required before the product is complete, since invoicing is external (D7), but
deliberately built after the polish phases — see §7 Phase 13. Who may export is
settled:
anybody who can see a report, for exactly what they can see.
*Recommendation: start with CSV* — one row per person per project per day, or
per person per project per period, with billable and client columns. Whoever
produces invoices already works in a spreadsheet. Confirm the grouping with them
before building; the wrong granularity makes the export useless.

**Q5 — Should the app chase people who have not logged time?**
The team view shows who is short, but somebody still has to look. Phase 3 made
"short" precise: logged below expected, over days that have finished.
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

**Q7 — How long should somebody stay signed in? — answered.**
A fifteen-minute access token with the existing thirty-day rolling refresh, and
no "remember me" choice. Confirmed in September 2026 for Phase 6: people stay
signed in on their own device, and a stolen access token is useful for minutes.

**Q8 — Is email verification needed? — answered: not now.**
Only a company's first owner signs up with an email address and password;
everybody else joins through an emailed invitation, which already proves the
address. Confirmed in September 2026: no separate verification flow while that
holds. Revisit only if the signup model changes.

**Q9 — When, where and on what budget does WorkTrack go to production?**
Blocks the final stage only. Production needs paid plans (Vercel's free plan is
non-commercial, and the free backend sleeps), a domain from the company, and
Google sign-in URLs registered for it.
*Recommendation:* decide once Phase 13 is in sight; nothing before then depends
on it.

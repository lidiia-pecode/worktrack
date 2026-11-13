# WorkTrack — Product & Business Reference

The single reference for **what WorkTrack is, how its business rules behave
today, what it should become, and in what order to get there.**

Companion documents: [`architecture.md`](./architecture.md) for the system
shape and where to start, [`permission-model.md`](./permission-model.md) for
who may do what and why, and [`workflow.md`](./workflow.md) for how a change
reaches `main`. This document explains the product those pieces serve.

**Status of this document.** Sections 1–6 describe behaviour verified against
the current code and are authoritative. Sections 7–9 describe agreed direction
and are the basis for planning work. Section 10 lists decisions that are still
genuinely open.

**Last verified against the code: 4 November 2026**, at PR #67. Everything in
§7's Delivered table is built, and so is the permission model. The work
ahead is a high-level improvement roadmap (§7); the production launch is a
final stage that starts only once the product is judged ready.

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
- **Not an HR system.** People belong to an HR product: the directory and org
  chart, who reports to whom, leave requests, approvals and balances, a public
  holiday calendar, attendance and onboarding. WorkTrack owns the work record:
  hours by project and activity, billable time, contracted capacity, plans,
  team actuals, reports, the export and locked periods. The two facts expected
  hours need, days away (D6) and contracted hours, stay plain facts with no
  balances, approvals or requests, and can come as a feed from the HR product
  one day. So an employee gets the timesheet and their own month, and nothing
  about other people (PR #51).

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

Whether time is billable is a property of the individual entry, on any project.
On a client project it defaults from `Activity.defaultBillable`; on an internal
project it defaults to non-billable. Either can be overridden whenever the entry
is created or edited.

*Why.* Client work is not automatically billable. Hours beyond an estimate, plus
communication, investigation and setup that the client does not pay for, are
**client work that is non-billable**. A project-level or client-level flag cannot
express this.

*Consequence.* Reporting keeps two independent dimensions. Billable or
non-billable comes from `TimeLog.isBillable` alone, on every project. Client or
internal comes from the project the time was logged against: a project with no
client name is internal. There is no third billing category.

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
and planned hours beside logged ones in Reports.

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

**Built in PR #20.** `Absence` is its own table with a date range, a fixed type
and an owner; an `Activity.isAbsence` flag that contradicted this decision was
removed with it. The rules are in §4.

### D7 — No money in WorkTrack

No rates, no revenue, no cost, no margin.

*Why.* Invoicing is handled externally. Rates would also bring genuine
complexity — a rate change must not retroactively rewrite last quarter's figures,
which means effective-dated rates — and cost data would put salary-grade
information into the app.

*Consequence.* `Company.currency` has no consumer and should not acquire one.
Reporting deals in hours. The handoff to invoicing is an **export of hours**, not
a monetary figure — the Excel export described in §6.

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
- **MANAGER** — employees in the teams they actively manage, on the days they
  were in them, and nobody else.
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

*Who wrote it is recorded, not a full history.* Since PR #61 a time entry and
an absence keep who added them and who last changed them, and say so wherever
the record is read when that wasn't the person it belongs to (§4). A trace of
deleted entries or of every change stays out until someone needs it.

### D10 — A manager sees only their own teams, everywhere

An OWNER has company-wide visibility: every team, every person. A MANAGER sees
the teams they actively manage and the people in them, on the days they were
in them (a team keeps its history, PR #63) — and that limit applies
to every list, not only to time data.

*Why.* The rule held for time logs, planning and reporting, but `GET /users`
and `GET /teams` used to hand a manager the whole company. A manager who may not
read someone's time could still read their profile and pick them out of a
filter, which made the boundary look arbitrary and exposed the full roster.

*Consequence.* The user and team list endpoints are narrowed for managers.
Together with D9 this makes one rule cover both halves: a manager reads and
writes within their own teams. It settles the read half of §10 Q3 (answered).

*Staffing was not covered by this decision.* `GET /users` used to answer two
questions at once — who a manager's people are, and who they may add to a team
or project. D10 narrowed only the first. The second kept its own company-wide
source, `GET /users/assignable`, because narrowing a picker while the write path
behind it is unchecked would be a hidden button rather than a permission.

**The rule that replaces it was settled on 21 September 2026** and is now
enforced: a manager assigns only the people they manage, plus themselves, both
in `GET /users/assignable`, in `syncProjectUsers` and in the one-person
project links; their save changes nobody
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
│                   lastWorkingDay: set by Deactivate, cleared by Reactivate
│                   deactivatedAt: when the owner confirmed Deactivate
│                   (each spell kept in user_inactive_periods once they
│                   return: last working day and first day back)
│
├── UserCapacity    user + validFrom + minutesPerWeek + createdBy
│                   working hours, effective from a date: set as a
│                   working day, stored as the week of five of them
│
├── CompanyStandardDay  validFrom + hoursPerDay + createdBy
│                   the company's standard day from a date; before the
│                   first row, Company.standardWorkHoursPerDay applies
│
├── Team ──< TeamMembership >── User
│                   roleInTeam: MEMBER | MANAGER
│                   time-bounded: joinedAt / leftAt
│
├── Invitation      email + role + status (PENDING | ACCEPTED | REVOKED)
│                   teamId (the team it is for) + invitedById (who sent it)
│
├── Notification    recipient + type + subjectUser + readAt
│                   type: INVITATION_ACCEPTED
│
├── ActCategory ──< Activity          defaultBillable
│
├── Project  (clientName: free text)
│     ├──< ProjectActivity >── Activity     which activities are allowed here
│     └──< project_users    >── User        who may log against this project
│
├── Absence         user + type + startDate + endDate + note
│                   type: VACATION | SICK_LEAVE | PUBLIC_HOLIDAY
│                   createdBy + updatedBy (who added it, who last changed it)
│
├── TimeLog         user + projectActivity + date + minutes + isBillable
│                   createdBy + updatedBy (who added it, who last changed it)
├── PlanningEntry   user + project + date + plannedMinutes + createdBy
└── ReportingPeriod month + status (OPEN | LOCKED) + changedBy
                    only for months an owner has reopened
```

**The pivotal join is `ProjectActivity`.** Time is never logged against a
project or an activity alone — always against a specific *activity enabled on a
specific project*. This is what makes "Development on Client X's redesign"
distinguishable from "Development on our internal tooling".

**What a project offers.** A project's activity list is what people may log
against there: an activity enabled on the project, and active in the company's
catalogue.
- *Removing* an activity from a project takes it off that project's list once
  confirmed, and the confirmation says that time already logged stays. Adding
  it again picks up the same link and history.
- *Archiving* an activity takes it off the list of every project. The owner or
  manager is first shown the active projects that offer it. Its project links
  stay, so restoring it puts it back on the same projects.
- Neither changes a time entry: past time stays under its project and activity,
  in the timesheet and in every report.

**Planning is the exception, deliberately.** A `PlanningEntry` names a project
and nothing finer: the activity is chosen when the time is actually logged.
Planning says which project, the time log says what work.

**A user belongs to exactly one company.** Email and `googleId` are globally
unique. The same person working at two companies would need two accounts with
different email addresses. There is no shared identity spanning companies —
consistent with §1's position on multi-company.

**A person is in one team at a time, and a team has at most one manager.**
The database holds both rules. Leading a team is that team's membership
(`roleInTeam = MANAGER`), so a manager's own hours count there; a Manager who
leads no team may be a plain member of another. Adding someone from another
team is a move: the old membership ends the day the new one starts, in one
transaction, after the owner confirms it. Someone who leads their team is moved
only once it has another manager. A team may have no manager, and the owner
then covers it. Leading a team is what grants reach; being a member only
decides who oversees your own time.

**Change manager is the one way a team gets its manager.** The owner picks,
from today, one of the team's members (an Employee is made a Manager in the
same change) or a Manager in no team, never someone in another team, so nobody
moves and no other team changes. The current manager stays in the team as a
member or leaves it; a deactivated one is replaced the same way. Moving a
manager to another team is three plain steps: Change manager on the old team,
keeping them as a member; Change team; Change manager on the new team.

**Team membership is historical, not current-state.** Rows are closed with
`leftAt` rather than deleted, so "who was on this team in March" remains
answerable. `leftAt` is the day a membership ended, not its last day, so somebody
can leave a team and rejoin it on the same day, and membership dates are the
company's dates, from its time zone. A membership starts the day someone is
added and ends the day they are removed or moved: today, unless the owner gives
an earlier day on the person's Change team or Add to a team dialog, or on
Remove from the team (a manager removes a member from today; the members picker,
a team's archive and Change manager always act today). An earlier day must be in
an open month, not before the person's account or the membership being ended,
and never makes someone a member of two teams at once. Nothing is scheduled
ahead, a membership's dates can't be changed once saved, and someone coming back
gets a new membership. Managership is derived from membership: a manager sees people who
share an active team with an active `roleInTeam = MANAGER` membership of theirs.

---

## 4. Business rules enforced today

All verified in the current implementation.

### Time logging

Every write passes five checks, in this order (`time-logs.service.ts`):

1. **Write scope** — the caller must be allowed to act for the entry's owner
   on its day (D9), through `assertCanWriteUser`: an owner for anyone in the
   company, a manager for the people in the teams they lead on the days they
   were in them, an employee for themselves. Moving an entry to another day
   needs both days.
   The entry is always matched on `companyId` too. The rest runs in one
   transaction, after the owner's user row is locked.
2. **Period lock** — a write touching a `LOCKED` period is rejected (403). On
   update, both the old and the new date are checked, so an entry cannot be
   moved into or out of a locked period.
3. **No future date** — a time entry records work done (D6), so one dated
   after the company's today is rejected (400), for every role, on create and
   on update. An entry already in the future can be moved back or deleted.
   Absences may be booked ahead (PR #51).
4. **Employed on that day** — a day after the person's last working day, or
   inside an earlier spell between a last working day and the first day back,
   is rejected (400, saying why), on create and when an entry moves to a new
   date (`assertEmployedOn`). The last working day itself stays open.
5. **Project activity and membership** — the `ProjectActivity` must belong to
   the caller's company (404); the owner must be on its project, a
   `project_users` row for `(projectId, userId)` (403), so a valid
   `projectActivityId` for a project the owner is not assigned to is refused;
   and it must be active, on an ACTIVE project with an ACTIVE activity (400).

After them, a day an absence covers is refused (see Absences) and the daily
total is checked (below).

On update, the new date's lock, the employed-day check and the absence check
run only when the entry moves to another date, before check 5; check 5 runs
only when the entry moves to another project or activity. An entry on an archived project or activity, or on a project its owner
has left, keeps its project and activity and can still have its duration, note
and billable flag corrected. Notes on time entries and absences can be cleared.

Additional constraints: a single entry is 1–1440 minutes; one person's total for
a single date cannot exceed 1440 minutes. The daily total is enforced under a
`pessimistic_write` lock on the user row inside a transaction, so concurrent
writes cannot exceed the budget between them.

When the entry does not specify `isBillable`, it defaults from
`Activity.defaultBillable` on a client project and to non-billable on an
internal one (D2). The time form starts a new entry the same way once the
activity is chosen, with the switch off until then, and the person can change
it on each entry, on any project.

**Who wrote it.** Every create records the caller as the entry's author
(`createdBy`) and every update as its last editor (`updatedBy`), whoever they
are; absences do the same. When either isn't the person the record belongs to,
it is named to everyone who can see the record, the person included: "Added
by", "Changed by", "Added and changed by", or both names. A person's own
records, and records from before PR #61 (both empty), show nothing. If the
person edits after a manager, they become the last editor and the "changed"
part goes. Deletes leave no trace.

### Absences

An absence is a date range belonging to one person, with a type — vacation, sick
leave or public holiday — and an optional note. It is never a time entry and
never appears in an hours total (D6).

Every write passes three checks:

1. **Write scope** — the same rule as time logs, through the same
   `assertCanWriteUser` helper, over every day of the absence: an owner
   records for anyone in the company, a manager for the people in the teams
   they lead on the days they were in them, an employee for themselves. An
   absence across a team move is read by both teams' managers and changed only
   by someone who reaches all of it, such as the owner; the screens open it
   read-only for anyone else and say who can change it.
2. **Period lock** — a range touching a `LOCKED` period cannot be created,
   changed or deleted, and neither can it be moved into one.
3. **The day is free** — no day of the range may already have logged time, and
   no day may already be covered by another absence, whatever its type.

Who added and last changed an absence is recorded and shown as for time
entries (see Time logging).

The rule runs both ways: time logging is refused on a day an absence covers.
An absence also deletes its owner's plans on those days (see Planning).
Each service reads the other's table directly rather than depending on it, and
both check inside the transaction that locks the owner's user row, which is what
stops two concurrent writes from each seeing a free day.

Absences are **whole days only** — no half-days or hours — and there are three
fixed types, a database enum rather than a per-company list. The cost of "a day
is either worked or absent", accepted deliberately: *worked half a day, then went
home sick* cannot be recorded without deleting the time log.

A range is refused whole rather than partially, and the refusal names the
conflicting dates. The database backs the range up with a check constraint that
`endDate >= startDate`.

**A public holiday belongs to a person, not the company.** Whether somebody
takes it or works it is their own record to make, so there is no company-wide
holiday calendar and nothing tells a person which days are holidays.

### The invariant worth internalising

> **Write access for a time entry matches read visibility: owners company-wide,
> managers within the teams they lead, on the days a person was in them,
> employees themselves.**

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
5. A day may not rise above the person's own working day — their capacity on
   that date over five, the company's standard day for someone with no
   capacity of their own, the same day Expected counts (PR #61, replacing one
   company-wide cap) — and a week, as set by
   `Company.weekStartDay`, above the person's **available** hours (capacity
   minus absences). Both refuse only a write that *raises* a total, so a day
   or week left over by a later absence or a lowered capacity is kept (a week
   over is flagged "Over by", below) and can always be reduced.
6. Nothing can be planned on a day the person wasn't employed, as for time
   entries (rule 4 there).

An update re-runs rules 1, 2 and 5 whenever it changes the date, project or
minutes. A day an absence covers cannot be planned: a new plan, or one moved
onto it, is refused. Recording an absence, or moving one, deletes that person's
plans on the days it covers, whoever records it — the person themselves
included, though they cannot write planning otherwise. An absence never touches
a locked period, so only open days lose plans, and deleting or shortening an
absence brings nothing back.

**A period** is planned and changed in one form: a person and a date range.
The form lists each project already planned in the range with its days; new
hours for one of them apply only to the days that already have it, and a
project added fills every working day — the range's weekdays the person has
hours on, with no absence and not before their account was created. Plans for
projects left untouched stay. A listed project's plans in the range can also be
deleted from its row, after a confirmation, at once and in one go; that delete
follows a single plan's delete (the same people, nothing in a locked month).
Saving applies to the result as a whole: a range touching a LOCKED month is
refused, and if any day or week would go over its limit, nothing is saved and
every day and week that does not fit is named; the form sums them up (how
many days go over the person's day, how many weeks over what they have
available, each with its worst). As with a single plan, only a
total the write raises is refused. The same checks run without saving (a
preview), so the form shows the fullest day, what saving will add and change,
the absences skipped and every conflict before anything is written, and saves
only once everything fits.

The planning grid shows managers one figure of its own: **no longer fits**
(planned above available, flagged as "Over by" and never fixed automatically).
It is not shown to an employee, who sees only their own plan, and it does not
affect whether somebody is behind. A deactivated person's plans up to their
last working day stay visible in the grid, read-only; deactivating removes the
ones after it. The grid shows working days only, since nothing can be
planned on a weekend, and its hour pickers stop at the person's own day; the
day dialog's hours stop at what still fits on the day and in the week, and
say so. "Add
absence" from a day records that day; from the period form it opens on the
chosen range.

**Removing somebody from a project deletes their plans for it from today
onwards**, in the company's time zone, never on a locked date; past plans stay
for Reports. Both membership screens confirm first, naming the count
from `GET /planning/removal-count`, which uses the same condition as the delete.
**Archiving a project deletes everyone's plans on it from today on** the same
way, after its dialog names whose and how many; past plans, its people, its
activities and logged time stay, and restoring it brings back the people and
activities but not the removed plans. Both delete exactly the plans their
rule matches when they run: a plan saved on the project at the same moment
waits for them and is then refused, or is counted if it came first.

Planning does **not** create time logs, does not restrict them, and never
changes expected hours (D3).

### Capacity and expected hours

Four words carry this, and they mean the same thing in the API, the interface
and this document:

| Word | What it means | How it is worked out |
| :--- | :--- | :--- |
| **Expected** | How much somebody was supposed to work | capacity from the day their account was created up to and including their last working day, minus the days they were away |
| **Planned** | What a manager committed them to, by project | the planning entries for those days |
| **Logged** | What actually happened | the time logs for those days |
| **Behind** | They logged less than expected | logged < expected, over finished days only; Reports' People card shows it as each person's logged time against expected, and since PR #46 nothing else marks it |

**Capacity** is a `UserCapacity` row: contracted minutes per week with the date
it takes effect, unique on `(companyId, userId, validFrom)`. An owner sets it
as **working hours a day**, in 30-minute steps up to 12h, and the week is that
day times five (PR #61), so the API accepts only multiples of
2h 30m a week up to 60h; hours saved before keep their value until next
changed. The day is what is expected of the person on every working day and
the most they can be planned on one; an uneven week is set as its usual day,
and logged time is never limited by it. The row in force on
a date is the last one starting on or before it; with no row at all, the
company's standard day on that date, times five, applies, so an ordinary
full-time company keeps an empty table. A change is a row from its date, which
is what stops a contract change rewriting weeks somebody has already worked:
it can't start in a locked month, saving the same date again corrects that
row, and hours equal to the person's own hours before it save nothing. Someone
on the standard day who is given hours gets a row of their own, even at the
standard day's value, and stops following its later changes. At most one
change waits after today: scheduling another replaces it, and the person's
panel shows it with Cancel. **0h** means no fixed hours: nothing is expected,
no day misses time, nobody can plan the person, and time they log reads as
neutral rather than over. Saving 0h deletes their plans from that date until
hours come back, and the person form says how many first.

The **company's standard day** is dated the same way: `standardWorkHoursPerDay`
is the day from the company's start, and each `CompanyStandardDay` row changes
it from its date. Settings sets it with an "Applies from" date, today by
default and never in a locked month, keeps at most one change waiting after
today, and lets the owner cancel it. The setup guide saves it the same way,
from today where the company is: at sign-up that is the company's first day,
and a guide opened again later changes nothing before today. Earlier days keep
the day they had, so changing it never rewrites a locked month.

**Expected** is computed in one place, `ExpectedHoursService`: every Monday-to-
Friday day in the range that no absence covers, from the day the person's
account was created in the company's time zone, each contributing a fifth of the
capacity in force that day, summed and rounded once at the end. Nobody is behind
for the days before they joined, and nothing is expected after their last
working day, nor, once they are reactivated, for the spell they were away, from
the day after their last working day to the day before their first day back
(kept in `user_inactive_periods`); there is no separate start date
(§10 Q14). Rounding once is
what keeps a full week away at exactly zero and a full week present at exactly
that person's capacity, for a part-timer as well as a full-timer. It returns
`total` for the whole range, `toDate` counting only days that have finished in
the company's timezone, which Reports' People card measures against, and a
figure for every date, which the timesheet draws each day's line and over-target
warning from. A day expects nothing on a weekend, an absence or before the
account was created. The days are rounded along a running total, so they always
add up to `total`.

**Expected never consults planning, and planning never changes expected** (D3).
Somebody with no plan at all has the same expectation as anybody else.

**Reports count finished days only.** When a range reaches today or later, the
hours and people reports and the hours export stop at
yesterday in the company's time zone, for logged and planned time alike, and
the reports say which day they counted to. Today's entries show in the reports
and the export the next day. Finished weeks match between Team time and
Reports; in a running week Team time shows the week's target and the time
logged so far, today included, while Reports count finished days only.

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
correctable until its period is locked, and Reports' planned and logged hours
become final at the same moment.

### Company settings and lifecycle

The company holds `timezone`, `currency`, `weekStartDay` and
`standardWorkHoursPerDay`. The timesheet reads all except currency rather than
hardcoding calendar assumptions. Currency is neither asked for nor shown (D7).
The time zone is any valid IANA zone except Russia's; the old name `Europe/Kiev`
is saved as `Europe/Kyiv`. The standard working day is 1h to 12h in 30-minute
steps, as a person's working day is, and changes from a date (see capacity
above); `standardWorkHoursPerDay` in the API is the day in force today, with
the change waiting after it. Slugs are
unique and regenerated on rename. Changing the time zone, the week start or the
standard working day asks first and says what each one moves; several changed
at once are confirmed together in one dialog.

A new company's owner answers four questions in the setup wizard — time zone,
week start, working day and whether they log their own time (Yes keeps them on
the standard day, or gives an owner at 0h its hours; No gives them 0h) — or
skips the rest at any step, which saves the answers given so far and always
the time zone, since every company starts in UTC and the one offered is the
browser's; opened again, the wizard offers the company's own zone unless it is
still UTC — then follows a checklist
whose steps end with somebody able to log time: a team, a category and activities, a project with
activities, and at least one person on it, the owner included. Inviting a
manager is optional, so an owner who manages everyone can finish. Setup is a
one-time flow: once it is completed, or the owner skips it, it never starts
again, and changes to teams or projects later do not reopen it
(`Company.setupFinishedAt`). "Getting started" stays in the owner's menu: the
checklist while setup is open, and afterwards a guide to how WorkTrack fits
together. A manager gets a welcome on Team time instead of a
checklist, and an employee one on their timesheet; each speaks only to that
person's own role. An employee with nothing to log sees why — on no project, or
on projects with no activities yet — and no week figures for that week. Team
time and Planning always show their people, the viewer included, even before
anybody has logged or been planned; when the viewer is the only one there, a
line says why — nobody else has joined, or the manager leads no team or an
empty one.

Every activity is in exactly one category (the database requires it), and never
in an archived one while it is active. Taking an activity out of its category
means moving it to another or archiving it; there is no state without one, so
past time always reports under a category. Changing an activity's category is
always allowed, and its time is reported under the new one. Archiving a category
moves its active activities to another active category or archives them with
it. An activity whose category is archived is restored by restoring the
category too or moving it to another. Restoring a category can restore all of
its archived activities with it, those archived on their own earlier included,
or the category alone.
Archived projects, activities and categories, like archived teams, are
read-only until they are restored.

Project, client, activity, category and team names are trimmed and keep their
case. Project, activity, category and team names are unique regardless of case;
client names are free text (D8).

A `SUSPENDED` company cannot be updated and cannot authenticate.
`Company.deletedAt` exists as a column with no soft-delete behaviour behind it.

### Access

A new company is created by self-service signup, which creates the `Company` and
its first `OWNER` together. Everyone else joins by **invitation**: an owner or
manager invites an email address with a role and, for an employee, a team, and
the invitee completes signup by setting a password or via Google. An owner may
invite a manager or an employee, a manager only an employee into a team they
lead. An employee invitation always names a team; an owner may also name a team
for a manager to lead, one with no manager and no other pending manager
invitation. That invitation holds the team's lead: Change manager waits until
it is accepted or revoked. There is no other way in: nobody is created directly.
Accepting an invitation that carries a team creates the team membership in the
same transaction that creates the user — a `MEMBER` for an employee, the team's
`MANAGER` for a manager. Only the owner invites managers and only the owner
appoints a team's manager, so this is not a second route to leading a team. The same transaction notifies whoever sent the invitation, if they
are still active, that the person has joined, so they can put them on a project;
it is an in-app notification only, and each person reads only their own.
A notification is deleted 60 days after it was read; unread ones are kept.
Invitation tokens are stored hashed and are `PENDING | ACCEPTED | REVOKED`.

An invitation is valid for seven days, a product rule rather than a setting. Its
email names the company, the sender, the role and the team. The invitation is
saved before its email goes out, so a failed email leaves it pending, to be
resent from the list, and the error says so. Pending invitations can be listed, resent and
revoked — by the owner for the whole company, by a manager for those into the
teams they lead; an expired one stays listed, marked expired, until it is resent
or revoked. A resend issues a new link and a fresh seven days, the old link stops
working, and sending and resending are each limited per session. Inviting an
address that has an account in another company is refused with a neutral
message: it shows the address cannot be invited, but not which company it
belongs to. A link that cannot be used says why — expired,
revoked, already accepted, unknown, or for an address that has since gained an
account — and, when expired or revoked, whom to ask. Someone already signed in
who opens a valid link is not offered the form: accepting would create another
person's account, so the page names both addresses and offers to go back to
WorkTrack or to sign out and accept.

Everywhere a password is chosen — sign-up, invitation, reset, Settings — the rule
is 8–100 characters with an upper-case letter, a lower-case letter and a digit;
an existing password is only checked for presence. Names are 1–100 characters and
company names 2–100 characters of any kind, without line breaks or invisible
characters. Sign-in says that an account is deactivated or a company suspended
only after a correct password. Asking for a password reset answers such an
account as any other ("If this account can sign in to WorkTrack, a password
reset link is on its way") but sends nothing, and a link sent before is
refused with the sign-in message when it is used, and every Google path refuses an address Google
has not verified. "Continue with Google" on the sign-in
page signs in only accounts WorkTrack knows; an unknown one is pointed to the
invitation email, and only the sign-up page starts a company. A failed Google
sign-in returns to the page it started from with a message, never an error on the
backend's host. A team with pending invitations can't be archived; the owner
revokes them on its panel first (§5).

Users are deactivated, never deleted (`ACTIVE | DEACTIVATED`); the screens say
Deactivate and Reactivate. Deactivate asks for the **last working day**: today
or earlier, not before the account was created or the person last came back,
and with the day after it in an open month. That day stays expected and can
still be completed by the owner or the person's manager. In one transaction,
Deactivate deletes the person's time, absences and plans after it and cuts an
absence that crosses it to end on it; the dialog lists what goes, updated with
the date, can't be confirmed until that list has loaded, and says it can't be
undone. Reactivate asks for the **first day back**, after the last working day,
today or earlier and in an open month, and keeps the spell in between, when
there is one; nothing is expected of the person, and nothing can be recorded,
from the day after the last working day to the day before they come back (§4,
capacity). Deactivating someone also ends their sessions at once, so after
Reactivate they sign in again. A user cannot deactivate themselves, an OWNER account
cannot be deactivated, nobody changes their own role, and nobody can be made
an OWNER, so a company has exactly one owner (handing ownership over is not
built yet). A deactivated person keeps their teams and projects but cannot be
added to a team or a project, and their details and working hours change only
once they are reactivated. Reactivate asks first and names the teams and
active projects they come back to; someone whose last working day is today
can be reactivated from tomorrow. The Deactivated tab and the person's panel
show the last working day, and Team time, Planning, Reports' People table and
the team and project panels say "Last day" and the date after their position.

---

## 5. Roles and permissions

`OWNER | MANAGER | EMPLOYEE`. There is no `ADMIN` role.

| Area | OWNER | MANAGER | EMPLOYEE |
| :--- | :--- | :--- | :--- |
| Company settings | read + update | read | read |
| Users — roster | full CRUD | list + read, within their teams | own profile only |
| Users — assignment list | whole company | the people in teams they lead, plus themselves | — |
| Invitations | create, any role, an employee always into a team, a manager optionally to lead a team that has no manager or pending manager invitation; list, resend and revoke any pending one | create, EMPLOYEE only, always into a team they lead; list, resend and revoke the employee ones into teams they lead | — |
| Notifications | own only: read, mark read | own only: read, mark read | own only: read, mark read |
| Teams | full CRUD, including a member's move, addition or removal dated back to an open day, and each team's one manager through Change manager; the Teams page is theirs alone | read, within their teams (filters and team links); remove a member (not a team manager) from the person's panel, from today | — |
| Projects | full CRUD; archive and restore are theirs alone | create, edit, staff their own people, choose activities from the catalogue | only their own, through `GET /projects/me` and `GET /projects/me/activities`, with the client name; the client name also on their own time entries |
| Activities, Categories | full CRUD | read | read |
| Time logs — read | whole company | own, plus users in teams they manage | own only |
| Time logs — write | whole company, a deactivated person's days before they left included | own, plus users in teams they manage, the same way | **own only** |
| Absences — read and write | as time logs | as time logs | own only |
| Planning — read | whole company | own, plus users in teams they manage | own only |
| Planning — write, a day or a period, and a period's preview | any active user | self + managed users | — |
| Reporting periods | reopen + close | read | read |
| Hours and people reports | whole company | own, plus users in teams they manage | own only, through the same routes |
| Hours export, timeline | whole company | own, plus users in teams they manage | — |

This matrix is what the code does today. Why it is shaped this way —
Owner-owned structure, manager-operated teams — and the open permission
questions are in [`permission-model.md`](./permission-model.md).

**Manager scope comes from team leadership, not from the role.** A MANAGER who
leads no team sees nobody else, and under D9 may therefore edit nobody's time but
their own; like everyone, they can always read their own time logs, absences,
plan and hours. Scope is computed from the `TeamMembership` rows of the teams
they lead now (`roleInTeam = MANAGER`, still open), by date: a manager reaches
a person on the days that person was in one of those teams, from the day the
membership starts up to the day before it ends, so the day of a move belongs
to the new team. After a move the old team keeps its history and its past
figures, and the new team's manager reaches nothing from before it
(`permission-model.md` §3.3, PR #63). The lists that are about now (People,
pickers, project rosters) read current membership.

D9 is implemented: `TimeLogsService` shares one scope check between reads and
writes, so the two cannot drift apart, and the Team time grid is where an
owner or manager acts on it. A deactivated person's time and absences can
still be corrected in open months by the same people, so their last month
can be finished without reactivating them; nothing can be dated after their
last working day, or inside a spell between a last working day and the first
day back (`permission-model.md` §3.7).

Team structure is the Owner's: only an owner creates, renames or archives a
team, adds a member, moves one between teams or changes a team's manager. A manager may remove a member
from a team they lead, from today, because removal only narrows their own reach
from then on; dating a removal back is the owner's, since it would take past
days from the team's history. Taking a team's manager off it,
themselves included, is the owner's (PR #53), since that would narrow someone
else's reach or leave the team without its lead.

Only a user with the MANAGER role can be a team's manager; the Owner, who already
acts for everyone, cannot. Change manager makes an Employee of the team a Manager
in the same change, so nobody becomes a Manager who leads nothing by accident. A
Manager who leads a team cannot be changed to another role until they no longer
lead it, and the refusal names the team. A team is archived only once
it is empty (no open membership, no pending invitation), which the owner does on
its panel; archiving then changes only its status, an archived team is
read-only, and restoring it brings it back as it was.

Company-wide structure is the owner's: teams, the activity and category
catalogue, archiving and restoring a project (which removes everyone's plans on
it), periods and settings. Managers create and edit projects company-wide,
staff them with their own people and choose their activities from the catalogue
(§10 Q3).

---

## 6. Where the product actually stands

Every feature in the original plan is built, and the authorization gaps found
early on are all closed. What the product lacks now is polish and breadth: how
easy it is to use, how the reports present their answers, what employees can
see, and how a new company gets started. §7 plans that work.

### Working end to end

- **Authentication and sessions** — email/password and Google, HTTP-only
  cookies, rotating refresh tokens that survive concurrent refreshes, password
  reset that signs you in, changing or setting your own password,
  invitation-based signup by password or Google. Rate limits count signed-in
  traffic per session and sign-in attempts per account.
- **Log my time** (`/timesheet`, the employee's timesheet) — the most complete feature and the best reference for
  frontend conventions. Log, edit and delete time against assigned projects,
  driven by company work settings, with loading, error, empty and over-target
  states. A new entry starts from the last project and activity logged for
  that person, or the only one there is. A week says "Complete" when its logged
  time is exactly what was expected, and how far past it when it is over. One row of controls carries the
  week's figures, which open a breakdown (expected and the days off that lower
  it, billable, non-billable, how much is past expected and how much of that at
  the weekend), and a lock during a month's grace week. A day that expects
  nothing is striped: a weekend in grey, turning amber once it has time, since
  weekend hours are always extra; a day off in the brand colour. Time past a
  working day's figure sits on solid amber with a "+Xh" badge. A day that
  hasn't happened yet can't be logged on. Each entry is drawn at least one
  readable line tall, opens on its own, and the empty part of a day logs a new
  entry. Where the screen is too narrow for seven columns, such as a phone, the
  week is a list of days instead: each day's total against expected and its
  "+", and every entry, plan and absence as a row with its details, opening at
  today.
- **Manage pages** — People, Teams, Projects, Activities and Categories as
  searchable lists; Teams, Activities, Categories and Periods are the owner's,
  so a manager's Manage menu is People and Projects, and an activity or
  category a manager opens from a project reads only. A row opens a shared side panel where every related name is
  a link and relationships are edited in place, and one confirmation dialog
  comes before anything risky. A project is client work, with a client suggested
  from those already used, or internal; an activity has a billable default and
  always a category. A project's panel lists its archived activities apart, and
  its archive dialog names whose plans from today on it removes.
- **Team time view** — owners and managers land on `/team` and read their
  people's week, a row each: the person, each day's entries as chips with the
  project and its hours (a plan dashed, shown on a day nothing is logged yet),
  and their week's hours against what was expected in a column on the right,
  as on Planning. Saturday and Sunday are left out unless someone shown has
  time on one, and open from Friday's heading. They correct the week in the
  grid: a chip opens that entry, the empty part of a day logs time for the
  person ("No time" on an empty past working day), and an icon by the name
  records an absence. A search by name or position, a sort by name or by how
  much of the expected time is logged, and filters by team and project
  (archived projects included) narrow it, and "Clear filters" comes with a
  search or filter that matches nobody; the team filter is offered to the owner and
  to anyone who sees more than one team, and a linked team the viewer doesn't
  see is dropped from the address. The week, the filters, the search and the
  sort are in the URL, so a reload or a shared link keeps them. The toolbar
  totals the people shown against what was expected of them ("Logged 30h /
  128h", with a bar). A deactivated
  person is marked with their last day and listed on every week up to their last working day,
  logged time or not; those days stay editable in an open month, the days after
  it are closed, and their week reads against what was expected up to their
  last working day. Filtered to
  a project, the rows and the team total show only that project's hours, with
  no Expected, since that is about the whole week ("Logged 12h"); the rows are the project's
  members plus anyone who logged on it that week, so somebody removed from it
  since stays listed, marked "Former member", with their hours in the total
  and their entries correctable (PR #61). Days follow the timesheet's look: a day over
  the person's hours on solid amber, a weekend with time in amber stripes.
- **Absences** — a person records their own days away as a date range with a
  type, from the timesheet, and an owner or manager records them for somebody
  from Team time; the timesheet and the team grid mark those days, so an empty
  week explains itself. A day is either worked or absent, never both.
- **Capacity and expected hours** — an owner sets somebody's working hours a
  day from a date, the week shown beside it, and the company's standard day the
  same way in Settings; a change waiting to start shows with Cancel. Both week views read one backend figure for what was expected,
  absences reduce it, and each shows logged time against it; no screen marks a
  person behind (PR #46, by decision). At 0h a person's panel says "No fixed
  hours", and the week views show their hours alone, never over. The owner is
  listed in People to themselves only, and edits their own position and working
  hours on their panel; nobody else manages the owner's account there.
- **Planning** — owners and managers plan their people's week by project on
  `/planning`, or a whole period for one person from their cell: a month at a
  time or any range, several projects with hours per working day, with a
  preview of the working days, the absences skipped, what is already planned
  and anything that does not fit before saving, all-or-nothing. The period
  dialog opens on the week shown, and a `Week | Month` control beside its
  arrows sets what they step by, Month jumping to the month that holds most of
  the shown days. The day dialog works the same way: the day's plans are edited
  in place, new lines add projects, and one "Save plan" saves the day, notes
  included. The grid shows working days only; each person's week reads planned
  against available hours ("30h of 32h") with a bar, and says which weeks no
  longer fit. It is narrowed as Team time is, by team, project (active ones
  only, since nothing is planned on an archived one) and a search by name or
  position, with the same "Clear filters" when nothing matches, and kept in
  the URL the same way.
  Under a project the
  rows are the people on it or with a plan on it, each showing only its plans
  and its hours ("on Acme redesign"). The toolbar totals the people shown
  ("Planned 120h / 160h" against their available hours; the planned hours
  alone under a project). A week lists the people with working hours in it or
  plans on it: someone at 0h shows only with plans left from before, marked
  "No fixed hours", those plans deletable but not changed; a leaver shows in
  the weeks they still had days in, the days after their last closed. A week
  wholly in locked months offers no "Plan a period", as a locked day offers
  nothing. A day
  can be planned up to the person's own working day, in 15-minute steps, and
  the day dialog's hours stop at what still fits.
  An absence day opens straight into its form, which names the person, and
  an absence can be added from a day or a period. Everyone sees their own plan on the
  timesheet until they log time that day, as faint blocks in the project's
  colour that open the time form on that project; recording an absence removes
  the plans on its days.
- **Closing periods** — each month locks by itself 7 days after it ends, and an
  owner can reopen a locked month from `/admin/periods` and close it again,
  each after a confirmation; the page lists the months back to the company's
  first and shows who last reopened or closed a month and when. The
  timesheet, team grid and planning grid show locked days as read-only, and
  during the grace week the timesheet says until when last month can be edited.
- **Reports** — owners and managers see one overview on `/reports` for a
  month, a quarter, a year or a custom range of up to 366 days, stepped with
  arrows from the company's first month and kept in the address, and for one
  team at a time: an owner any team, a manager who leads several any of
  theirs, the export included (PR #62). A badge names what the figures cover:
  the period once it has ended ("October 2026", "Q3 2026"), and while it runs
  the days counted so far ("Nov 1 - Nov 7 so far"). The band's three figures
  are time logged against what was expected (capacity minus time off), what was
  planned against it, and billable time against logged (by each entry's flag,
  D2), each with its share; nothing is compared with the period before, since
  part of a running period against a whole one says nothing. Below, week by
  week (month by month past 92 days, from the company's first month, a week
  with no working day and nothing on it left out): each column a pale block of
  what was expected with what was logged, its billable part striped, planned
  standing beside it, time past what was expected ending the column in the
  warning colour, with its figures on hover. A longer period links to the
  months in it still open. While a month is open, "Needs attention" says each
  kind of problem once, in at most two cards, each name opening its panel:
  people with working days with no time logged (in a month still running,
  only for weeks that have ended, since many log their week on Friday), owners
  included, and projects at least 8h and over a tenth off their plan, or client
  projects with 8h or more and no plan (in a month still running, only over
  plan, since late logging only lowers logged time). None is about somebody
  logging less than expected; a plan beyond someone's hours is Planning's to
  warn about. A locked month is for reference and marks nothing.
  Reports report working time, not absences: a person is listed when, on the
  days the view holds them while employed, they had working hours (before time
  off) or logged or planned time, whatever their role or status; time off
  lowers what is expected and counts as days off only on days with working
  hours. People is one table, each person once with their figures on the days
  the view holds, so the rows add up to the band: Logged, Expected, the share of
  expected with a bar (billable striped, time past expected in the warning
  colour) and Billable as a share of logged. Under a person's name is their
  position, with "Last day" and the date for a leaver or, under a team
  filter, "Joined" or "Moved out" and the date in the same line. It opens on the
  people furthest from what was expected, either way, those expected to work
  nothing last; any column sorts from its header, and the first ten show until
  the rest are asked for. Where the time went switches between projects and the
  kind of work: projects as a table of Logged, Planned, the difference with a
  bar ("+71.5h", "0h", "no plan") and Billable, most logged first, or logged
  time by activity category, the five largest each in a colour of its own and
  named with its hours, the rest in an "Other" that opens. Where a card is too
  narrow for the columns, beside an open panel or on a phone, each row is the
  name with its main figure, a short note and the bar. The one mark is a dot
  beside what Needs attention names. Figures are in decimal hours, up to two
  decimals ("1,412.5h"); the export keeps exact time. It is a fact, not a score
  (D3): nothing is red or green. A person's name opens their whole period, under
  a team filter too: logged against expected, their plan, billable time, days
  off and days with no time logged, each marked in the chart's colours, their
  teams in date order with their days and figures (a team archived since
  says so beside its days, "No team", or
  "My time" for the viewer's own days outside the teams shown), and their
  projects against plan, with a link to Team time; a project's name opens its
  billable time and its people against their plans. Everything counts finished
  days only (§4, capacity and expected hours). Managers see only the team they
  lead, and choose a team only if they see more than one; in another person's
  panel they see only their team's part.
- **Review my time** — every role has `/my-time`, their own month, one at a time,
  back to the company's first: logged against expected with their days off,
  planned, billable and its share, every working day of the month (a past day
  with no time opens that week on the timesheet while the month is open, today
  is ringed, and the days to come are dashed, showing any day off already on
  them), and their
  projects against plan, in decimal hours. The figures are the ones a manager
  sees in their panel on Reports, through the same routes pinned to the person
  (§5), and count finished days only, in Reports' band, whose badge names the
  month or the days counted so far. A month with nothing
  expected, logged or planned for them says so. Nothing about anybody else is
  shown.
- **Hours export** — from Reports, owners and managers download the
  selected range as an Excel file for invoicing (D7): one row per person (with
  their email after the name), day, project, activity and billing (Billable or
  Non-billable, by the entry's flag), in hours and minutes, with no notes. The
  `Client` column is empty for internal work. The people, days and totals are
  the Hours report's; one spelling is used per client, and a `Period` column
  says whether each row's month is still open to edits. Names are written as
  text, so a name starting with `=` is never run as a formula.
- **Manager scope** — a manager's user, team and time lists all narrow to the
  teams they actively lead, and so does the list they staff from, plus
  themselves.
- **Onboarding** — the owner's setup wizard and checklist, which end once
  somebody can log time (§4, company settings), and a manager's welcome on Team
  time.

### Decided while building, and still in force

- **Pages are named by what you do there** (30 October 2026, PR #59). The
  timesheet is "Log my time", a person's own month "Review my time", and the
  team's week stays "Team time", with no period in a name so it holds as the
  pages grow. Only what a user sees changed (menu, headings, wording); routes
  and code keep `/timesheet`, `/my-time` and `/team`.

- **One visual language** (10–13 November 2026, PR #72). A pill marks only what
  someone has to act on (No team, No active manager, Expired, Closing soon,
  Reopened), in amber so a warning never reads as an error; a fact
  (Deactivated, Archived, Locked, Open, a role) is quiet text. A page with a
  period has one toolbar: the period control on the left, the total on the
  right as "Logged 30h / 128h" with a bar, actions last; it stays while the
  content loads, and a part that fails to load says so with Try again. The
  company's and a person's working day are one field. Dates read in US English
  whatever the browser's language.

- **One way to close a dialog** (4 November 2026, PR #67). No dialog has a
  close button in its header: it closes from its footer, "Cancel" in a form
  and "Close" in a read-only one and in Notifications. Escape and a click
  outside ask first while a form has unsaved changes, the management create
  dialogs included, and do nothing while a save runs. The work dialogs (Log
  time, an absence, Plan a day, Plan a period) share one frame: the action as
  the title, who and when beneath, and Delete as a quiet button apart from
  the one solid primary action. A confirmation's title is a question, and
  "This can't be undone." is said once. Leaving Settings with unsaved edits
  asks first too, by a link, a reload or a closed tab (PR #60); the
  browser's Back can't be stopped.

- **Confirmations say what happens to the data** (29 October 2026, PRs #56–#58).
  Delete means a record is gone for good (a time entry, an absence, a plan);
  Remove means a link ends and both sides stay (a person from a team or a
  project, an activity from a project). The confirm button is red when
  something is lost that Restore can't bring back, amber when it can be undone
  but reaches further, the brand colour when it is routine, and green for
  Restore and Reactivate.

- **Archive means out of use, kept whole, for teams too** (27–28 October 2026,
  PRs #56–#58), reversing "archiving closes the team". Only an empty team is
  archived, emptied on its own panel, and restoring is an exact undo; nobody's
  time, absences or plans change at any point.

- **Ending a link is its own action, and past work reads as it was**
  (27–29 October 2026, PRs #56–#58). Archiving never removes people, links or
  invitations: what has to happen first blocks the archive and says so. A
  plan that can no longer happen is removed, and the action that removes it
  names it first (archiving a project, removing someone from it, recording an
  absence). Past rows keep their category and their team; a project's client
  is the exception (D8, read as it is now). A state nobody uses is removed
  rather than kept (draft activities, `COMPLETED`).

- **A team's week is read and corrected in the Team time grid** (26 October
  2026, PR #54), reversing "`/team` stays a summary grid". Each day lists its
  entries, so an owner or manager sees what a week consisted of and fixes it in
  the cell, with no side panel beside the grid; the timesheet stays the
  person's own screen.
- **Reports are for owners and managers.** The Reports page, the timeline and
  the export are theirs. Since PR #51 the hours and People reports answer
  every role, an employee's pinned to their own rows (`applyUserVisibility`),
  because Review my time is built from them; the planned-vs-actual route was
  removed in PR #49, since the People report covers it and no screen used it.
- **No utilisation ratios** (PR #49). Billable utilisation, client share,
  non-billable client share and logging completeness were replaced by plain
  hours: one bar per row against expected or planned hours, with whole-hour
  figures. Comparable products define "utilisation" in inconsistent ways, and
  a ratio per person reads as a score.
- **Periods are calendar months that lock by themselves**, worked out from the
  date on every check, because a scheduled job would miss days while the
  backend sleeps.

### Fields that exist but do nothing

| Field | Status |
| :--- | :--- |
| `Company.currency` | Read by no logic and no longer asked for or shown. **Should stay unused** under D7. |
| `Company.deletedAt` | Column with no soft-delete behaviour behind it. |

### Authorization

Every gap found in the original review is closed: managers cannot widen their
own reach, invitations place people in the inviter's team, project rosters and
staffing are scoped to the caller, and project and admin routes are guarded by
role on the server and in the pages. What a manager may see and change is one
rule everywhere — the people in the teams they lead, on the days they were in
them, plus themselves.
[`permission-model.md`](./permission-model.md) describes the model.

### Engineering state

This is the one place that counts the tests. Backend coverage is fifty-two
suites and 955 tests, covering the role-visibility filters and reach by team
membership dates (a team keeping its history after a move), team and invitation
rules, the Google callbacks and notifications, time-log, absence, capacity and
planning rules, who added and changed a time entry or an absence, the lock
order between plan saves and project changes, monthly locking in and outside UTC and a Close that waits for
an open write, the reports and the export (weeks or months on the timeline,
one team, the export's file name), page and date-range limits, name
checks, the seed's local-only guard, the Neon migration risk check, and
session refresh, a sign-in racing a deactivation, rate limits and token clean-up — most against a real
database.
The frontend has seventy-seven Vitest files and 457 tests: its date, month,
absence, lock, paging and time zone helpers, the report range check, the
period Reports shows (in the address, stepped and switched between units),
the chart's labels and start, decimal hours, a day's fill at 0h, a team's
billable sum, tab
keyboard navigation and download file names, and component tests in jsdom for
the sidebar and phone menu, sign-out, the shared states and form field, the
Manage lists, panel and confirmation dialogs, the work and create dialogs'
discard check,
the time entry form, the duration stepper, the timesheet day column and its
list of days on a phone, the
Team time view, its day cells, rows, filters and sort order, the Planning week
view and its day and period dialogs, the week a grid shows, the month a report shows, the week calendar, the week summary, the order of a day's entries, the Periods list and its paging, the Review my time page, who may choose one team on Reports, the notifications menu, a side panel's focus after Back, and the proxy's and the HTTP client's session handling. GitHub Actions runs the
formatting check, lint with no warnings allowed, typecheck, build and tests for
both applications on every pull request.

The backend has a production image (`apps/backend/Dockerfile`); the frontend is
built by its host. A shared development stand runs on Vercel, Render and Neon on
free plans, with migrations applied by hand; there is no production environment,
by decision, until the product is ready (§7). The stand is for development and
testing only: no public production domain, test data, no real end users, and no
real-user rollout planned in the near future.

Access tokens live fifteen minutes and refresh tokens thirty days. A page holds
at most 100 rows and a larger request is refused; views that need a whole list
fetch it page by page. Reports and date-range figures cover at most 366 days.

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
  billable/non-billable — to hand to whoever produces the invoices. A manager
  can export the same for the teams they lead.
- **Nobody** approves anybody's timesheet. Someone else's time can be corrected
  by their manager or by the owner, inside an open period, and never by anyone
  else (D9).

The features behind all four are built. What is not there yet is the quality
that makes people want to use them: fast entry, screens that behave the same
way, reports that answer questions at a glance, and a company that can get
itself started without help.

### Delivered

Built from August to November 2026, one pull request at a time; the first
row predates pull requests. The rules each one settled are in §2 and §4–§6;
the detail of how each was built is in its pull request. Pull requests for
tooling, documentation and small fixes are left out.

| Pull request | What it delivered |
| :--- | :--- |
| September 2026 | Authorization gaps in project routes and planned vs actual closed; first tests |
| #12 | Team time view at `/team`, with a per-person panel owners and managers edit through |
| #14, #16, #18 | The permission model: team structure the Owner's, so a manager can't widen their own reach; a manager inviting an employee straight into a team they lead; project staffing and rosters scoped to the caller, with managers and owners as project members |
| #20 | Absences as date ranges, separate from time (D6) |
| #22 | Capacity from a date, and one Expected figure: capacity minus absences |
| #23 | Planning by project per person per weekday |
| #24 | Months that lock by themselves, and the `/reports` page |
| #25 | Sessions that stay up, per-person rate limits, changing your own password |
| #26 | Recoverable invitations, and every employee joining into a team |
| #27 | Page and date-range limits, exact name checks |
| #28 | CI that checks formatting and lint strictly; frontend tests |
| #29 | A local environment that runs what is on disk, checked from a clean clone |
| #30 | Week views and reports polish |
| #31 | Keyboard and screen-reader access, AA contrast |
| #32 | Excel export of hours |
| #33, #34 | Company setup: a three-question wizard and an owner's checklist that ends with somebody able to log time; a manager's welcome; only Managers lead teams; archived teams closed; clients and billable defaults on the forms; local development on the host |
| #35 | Invitations, joining and signing in: seven-day invitations with a fuller email, expired ones kept and resendable; an invitation page that explains every link; Google failures back on WorkTrack pages; one password and name rule; no username or direct creation; a "joined" notification for the inviter |
| #36 | The rest of the first run: one look for every auth page; invitation links that handle a signed-in visitor and an address that already has an account; Expected from the day an account was created; first screens for each role that say why there is nothing to log, with role-focused welcomes; Team and Planning always showing their people; a manager invited to lead a team; activities that stay off a project once removed |
| #37 | Fixes left from the first run: active activities only in active categories, with simple archive and restore dialogs; a refused role change that saves nothing; stricter input checks; the password checked before account status; unverified Google emails refused; a race-free team addition; old read notifications cleaned up; the `username` column dropped |
| #38 | The application shell: navigation grouped into Work and Manage, with Getting started apart; an accessible phone menu that closes on navigation; one page frame and one page header; sign-out that clears every cached query; component tests |
| #39 | Shared UI: one version each of the loading, error and empty states, card, form field, select, dialog footer, confirmation, badge and report table, built on the design tokens; people deactivated rather than archived everywhere |
| #40 | The Manage redesign: users, teams, projects, activities and categories as searchable lists with a shared side panel, related names as links, relationships edited in place and one confirmation before risky actions; draft activities without a category; create dialogs that ask for the name first |
| #41 | Manage polish: rows that show what an item belongs to, project colours, a status only when something is archived, deactivated or a draft; a taken name shown under the field; project descriptions as Markdown; a realistic demo seed that runs only against a local database |
| #42 | Security and dependencies: Next.js 16.3.8 and patched packages; password hashes one at a time; `null` refused where a value is required; session details cut to their column sizes; a session-expiry redirect that works more than once per tab |
| #43 | Accurate documentation, then the first Area 3 slice: billable independent of project type, with past internal-project entries reset so no figure moved; editing entries on archived projects and clearing notes; each day's expected line from the person's own days; days read-only when locks fail, and the company's week first; "Add absence" from the empty state, a complete week, the shared Billable switch; a check before losing changes in a form; project hours only under Team time's project filter |
| #44 | Faster time entry: a new entry starts from the last project and activity used for that person, or the only one there is, with Billable off until an activity is chosen; the duration in the dialog header, minutes carrying into hours; the week calendar stepping by month; a tab left open moving on to the new week; a day's entries in the order they were logged; Ctrl/⌘+Enter saving the note |
| #45 | Periods and Settings: the Periods page as a full-width table with a lock icon on locked months and who last reopened or closed a month and when; a confirmation before Close as well as Reopen, and a list that ends at the company's first month; the period lock check inside each write's transaction, so a Close waits for an open write; Settings tabs that ask before dropping unsaved edits, and a standard-day change that says what it affects |
| #46 | The person's week on Team time as a side panel beside the grid, with their absences and, on empty days, their plan; owners and managers record a person's absences from it; the open person in the URL; a deactivated person shown read-only, with the API refusing time and absence writes for them; no "−Xh" behind badge on Team time or the timesheet |
| #47 | Planning a period: a person's cell opens a dialog that plans a month or any range on several projects in one all-or-nothing request, with a server-checked preview of the working days, the absences skipped, what is already planned and every conflict before saving; an absence removes the plans on its days and a plan on an absence day is refused, with old weekend and absence-day plans deleted once; absences opened and added from the Planning grid; a deactivated person's row read-only, the "+" always visible, cells readable to screen readers, the day dialog asking before discarding; one compact time picker and one calendar range field across forms; quiet buttons hovering in the accent tint |
| #48 | Cross-cutting UI: no visible page headings on the work, Manage and Settings pages, with an `sr-only` h1 kept; the Manage pages' Create beside the search; the page named in the phone header; Periods' lock rule as a note above the list; Planning's plans as project-coloured chips; an absence striped and a weekend flat on every week view, and a deactivated person marked on Team time; `secondary` as the cool accent, with control hovers in it and one warm `muted` opacity per role; week controls of one height, with "Back to this week" beside the week's total |
| #49 | Reports on one overview page, one month at a time: one cut-off at yesterday for every figure and the export, with an Email column in the export; week by week first with the month's logged, planned and billable time; "Needs attention" while the month is open, in at most two cards (missing time over finished weeks, projects off plan or with unplanned client time), each name opening its panel; people by team against their expected hours; where the time went, by project against plan or by kind of work; one bar and one whole-hour figure per row, a lighter bar for time with no plan, and one dot for what needs attention; one line saying how far the month is counted and whether it is open for edits or locked; a person or a project in a side panel kept in the URL; the People and timeline reports replacing utilisation and planned vs actual; an owner listed with a plan too; expected hours stopping on the day an account is deactivated, which Deactivate now records |
| #51 | My time: a person's own month for every role, from the Reports figures with the hours and people reports opened to employees and pinned to themselves; every working day of the month, today ringed and the days to come dashed, a past day with no time opening its week on the timesheet; the timesheet's week in one row with its figures behind a breakdown, weekends, days off and time over the day each with one look on every week grid, plans as faint blocks that open the time form on their project, no time logged for a day that hasn't happened, Enter and Escape in the duration fields, the whole week highlighted in the calendar and one soft "Back to this week"; the boundary with an HR product written down |
| #53 | Fixes across areas: nothing expected of a person for a spell they were deactivated and came back from, and an owner's own days without time on My time and in their panel; planning edits that can't deadlock with a period plan, and a period preview walking expected hours once; notifications read only once shown, unread first; sessions kept through a sign-in page, a throttled refresh or a backend asleep, and a deleted session no longer locking anyone out of sign-in, with lookups refusing a missing value and database conflicts repeating nothing sent; the timesheet's excess in line with its entries, locked absences opened to read, typed minutes carried into hours and the week link tidied; a team's manager removable by an owner only, focus back after Back, Team time's empty days named for a screen reader, and lighter placeholders |
| #54 | Team time with rich cells: each day's entries as project-coloured blocks that open the entry form, the empty part of a day logging time for the person and an absence icon by each name, replacing the side panel; the plan on a day with nothing logged; the team summary returning each day's entries on request; search by name or position, a sort by name or by the share of expected time logged, and archived and completed projects in the project filter; the week in the URL on the timesheet, Team time and Planning, and Team time's filters too; Reports' days without time linking to their week on Team time with the person highlighted; a person column that stays put while the days scroll; no day totals in the Team time and Planning headers |
| #56 | Teams and leavers: a leaver's time and absences corrected by owners and managers on the days before they left; one member team per person, adding someone to another team a confirmed move; the owner in no team; a team's former members, pending invitations and "Move to…" on its panel; a team archived only once empty, with restore an exact undo; Reactivate confirmed, the day someone was deactivated shown, and a leaver marked on the People card; the Teams page the owner's, a manager removing a member from the person's panel, and Users renamed People |
| #57 | Projects, activities, categories and plans: every activity always in a category, drafts removed and the database requiring one; taking an activity out of its category a move or an archive; archiving a project removing everyone's plans from today on, named first, and its archived activities listed on its panel; the activity catalogue and archiving or restoring a project the owner's, with a manager's menu of People and Projects; membership dates set by the server; restore of an activity or category no longer failing; the unused `COMPLETED` and `INACTIVE` statuses removed |
| #58 | Cross-cutting: a deactivated account unable to reset its password or keep a session, and edited only once reactivated; one owner per company; archiving a project or removing a member deleting exactly the plans it names, with plan saves waiting for it; one confirmation dialog with Delete and Remove by what happens to the data and colours by what can be undone; changing the time zone or week start asking first, with one dialog for several changes; Team time closing the days of an earlier inactive spell, and an invitation unable to slip into a team being archived; a person's plans changed and deleted across a period from the period form |
| #59 | Time entry on a phone: the timesheet's week as a list of days where seven columns don't fit, each entry, plan and absence a row with its details and the list opening at today; short entries at least one readable line tall on the grid; a day no longer one button around its entries, the empty part of a day logging time and an absence opening from its own button; Timesheet and My time renamed Log my time and Review my time |
| #60 | Consistent screens: WorkTrack's own pages for a missing address, an error and a loading route; a browser-tab title per page; the month on Reports and Review my time, and Planning's team, kept in the address; Settings asking before unsaved edits are dropped by a link or a reload; "company" for the company and its settings, "workspace" only for the working environment; the capacity date on the shared calendar, unable to reach a locked month; the setup checklist no longer ticking Company details; Team time's total following its search; the documentation checked against the code |
| #61 | History that keeps its people: Team time's project filter keeping the people removed from the project, marked "Former member", with their hours in its total; who added and last changed a time entry or an absence recorded and named to everyone who can see it; the period preview naming only the days a save changes, and adding a person to a project locking them before the project, as a plan save does; the daily planning limit as the person's own day, and working hours set as a day in 30-minute steps up to 12h, the company's standard day too; Planning on working days only, with a compact "Planned" column, hour pickers stopping at the person's day, a day dialog whose hours stop at what fits and that closes after a save, conflicts in a period summed up, and "Add absence" from a day or a period |
| #62 | Reports beyond one month: a month, a quarter, a year or a custom range of up to 366 days, stepped by its unit, chosen in a calendar and kept in the address, with a way back to the current one; weeks up to 92 days and months beyond, from the company's first month; the People report and its timeline worked out once in one request; one team at a time for an owner and a manager of several, the export and its file name included; the three figures in a branded band with their shares as rings and the change in points from the period before; billable time striped on the chart and the rows, overruns ending a bar, teams showing their change; Needs attention for a single month, with links from a longer period; a light salmon warning colour across WorkTrack, a mauve Planned and a softer logged teal in report marks; Planning's last column and Getting started lighter |
| #63 | A team keeps its history: a manager reaches a person's time, absences and plans, for reading and writing, only on the days the person was in a team the manager leads now, the day of a move belonging to the new team; Team time and Planning list someone who moved in both teams' weeks, the other days closed in the read-only tint with a tip, and "Moved out" or "Joined" and the date under the name; an absence across a move read-only for a manager of one team, and a planned period skipping the other team's days; Reports, the comparison and the export counting each team's own days, with someone who moved under each team for the owner; a leaver's days after they left closed the same way; the move and removal dialogs saying where the days go |
| #64 | Security audit fixes: Next.js 16.4.5 and the non-breaking `npm audit fix`; HSTS, `nosniff`, `X-Frame-Options` and `Referrer-Policy` sent by both apps; a session's IP from `req.ip` rather than `X-Forwarded-For` as sent; linking Google refused for a deactivated person; `avatarUrl` validated; mail failures logged without the address; `AUTH_COOKIE_SAMESITE=none` refused |
| #65 | Audit follow-ups: a session never created for someone being deactivated at the same moment; completing a Google link with a password limited as sign-in is; token lifetimes always with a unit; an invitation saved before its email goes out, so a failed send leaves it pending to be resent, and an acceptance share-locking its team, so an archive at the same moment waits and then refuses; Team time's entries asked for over a month at most; `multer` pinned to 2.5.0 |
| #66 | Reports figures: the person panel's projects under the page's team filter, adding up to the row for someone who moved; a change from a period with hours expected and none logged saying so in its tip; teams folded or opened by hand starting by their size again when the period changes; the documentation synced through PR #63 |
| #67 | The manager's week, finished: Planning narrowed by team, active project and a search by name or position, as Team time is, with "Clear filters" on both grids and Team time's search and sort kept in the URL; a team filter on the absences and plans the grids fetch; toolbars reading `Logged 30h / 128h` and `Planned 120h / 160h`, only the logged or planned hours under a project; the period dialog opening on the shown week with a `Week | Month` control beside its arrows; Plan a day rebuilt on Plan a period's model, its plans edited in place and saved with their notes in one request; the work dialogs on one frame, closed from the footer only and asking before unsaved changes are lost, confirmations titled as questions; the week grids waiting for the month locks before showing a day; controls on one scale of heights, radii and one border; the demo seed with Emma Clarke in one team |
| #69 | Dates for people and hours: deactivating asks for the last working day, which stays open, and removes what was recorded after it, and reactivating for the first day back; a person's working hours and the company's standard day changed from a chosen date, with the one change waiting to start shown and cancellable; a team move, addition or removal dated back to an open day by the owner |
| #70 | One team per person and one manager per team, held by the database: the owner picks a team's manager with Change manager on its panel, from its members (an Employee made a Manager in the same change) or a Manager in no team, the previous one staying as a member or leaving; team leaders shown but not choosable in the members picker and moved only once their team has another manager; a pending manager invitation holding a team's lead; Reports counting a manager once; the team filter on Team time, Planning and Reports offered to whoever sees more than one team, a link to a team they don't see dropped from the address; fewer notes telling a manager they see only their own people |
| #71 | Report figures that add up: Reports, Team time and Planning counting the same people, anyone with working hours, logged or planned time on the days in view, leavers and the owner included; each person listed once, with their teams and the days outside them in their panel, so the rows add up to the period; 0h meaning no fixed hours and neutral on every screen, saving it deleting the person's plans from that day; the owner saying in the setup guide whether they log their own time, a second save changing nothing before today; Reports in decimal hours without the period comparison, People and Projects as sortable tables that fold into compact rows on a narrow screen |
| #72 | One visual language, and screens that fit: an amber warning, pills only for what someone has to act on and quiet text for facts, leavers shown by their last day; one toolbar total with a bar on every page with a period, kept while content loads, and a line with Try again when plans fail to load; Review my time in Reports' band; one side panel layout with actions in the top bar, the key fact under the name and editing in place; one working hours field, and a skipped setup guide keeping its answers and the time zone; one row and one chip in Team time and Planning, sortable by person and total, Team time fitting 1280px with weekends shown when needed; no "Plan a period" on a locked week; dates in US English; the week calendar, Settings, Periods, Plan a period and Reports fitting tablets and phones, and an unread mark on the phone menu |

### Improvement roadmap — high level, flexible

Planned on 28 September 2026 after a review of the code, the screens and the
documentation. WorkTrack is not considered ready for production yet, and this
stage is what makes it a better product first.

**How to read it.** The roadmap names the broad areas to improve and what each
covers. It deliberately settles no business decision and no implementation
detail: an area gets its detailed design, with its own decisions, only when work
on it starts. Areas can grow, shrink, split or change as the work teaches us
something.

**UI/UX runs through every area.** Each area reviews and improves all of its
important pages and flows, for every role that uses them — Owner, Manager and
Employee — and not only its functional problems:

- usability and ease of use, and interactions that are confusing or awkward;
- page structure, navigation and visual hierarchy;
- consistency with similar screens elsewhere in the product;
- forms, tables, filters, dialogs and actions;
- responsive and mobile behaviour where the page is likely to be used on a
  phone;
- a modern, clean appearance built from the visual foundation in `globals.css`;
- anything that makes the product feel unfinished.

Every area also keeps accessibility at the level PR #31 set (WCAG AA), adds the tests
for what it changes, and updates the documentation it affects.

**Area 1 — First run and onboarding** *(done)*. Everything a new
company and a new person meet before WorkTrack is useful to them: sign-up, the
company setup wizard and the owner's and manager's checklists, inviting people
and joining, the first screen each role sees, empty states, and explaining
WorkTrack's concepts — teams, projects, activities, categories, billable work,
capacity and periods — where they are first met. Setup should end with a company
in which people can actually log time, which also means setting up projects and
activities properly, clients and billable defaults included. The public landing
and sign-in pages, the invitation email and the Google sign-in paths belong
here, as do the basics of a person's own account settings.

**Area 2 — Application shell and shared UI** *(done)*. The frame
every page sits in and the parts every page is built from: navigation per role,
the sidebar, header and user menu, page layout and headers, and one version each
of the table, card, form field, select, dialog, confirmation, loading, empty and
error patterns, all built from the tokens in `globals.css`. It sets the standard
the other areas apply to their pages, so it may run alongside Area 1 or straight
after it, and it includes what the frontend needs to test components rather than
only helpers.

**Area 3 — Everyday time entry** *(started)*. The employee's timesheet
and absences, the screen people use most. Logging should be fast, with the plan,
recent work and common durations doing much of the typing; a week should say
clearly when it is complete; the figures it shows — billable, internal, expected
— should mean the same as everywhere else and start when the person started; and
it should work on a phone.

**Area 4 — Team oversight and planning** *(started)*. The
manager's and owner's week views: the team grid and the planning grid. Finding who is behind and why, correcting somebody's week including their
absences, planning more than one cell at a time, and grids that draw days,
absences and locks the same way. Planning and Team time stay separate screens by
decision: they share the chrome, not the job (actuals and corrections on one,
intent and limits on the other).

**Area 5 — Administration and settings** *(done)*. The
owner's and manager's admin screens — people, teams, projects, activities,
categories, periods and company settings. Lists that scale past a few dozen
items with search that covers everything, confirmations before anything is
archived, forms and dialogs that behave the same on every screen, and settings
that say what a change will do.

**Area 6 — Reporting and insights** *(started)*. What owners and managers learn from
`/reports` and the export. Which questions each role actually brings, and how
the answers are best shown — charts, drill-down from a client to its projects and
people, trends over months, a team view for the owner, sensible date presets —
together with the figures that can mislead today. To be reviewed with the people
who use the reports before it is scoped.

**Area 7 — The employee's own view** *(done)*, in one piece of work by design: an employee has the Log my time page and the Review my time
page, their own month from the same figures a manager sees in Reports. What they may see of their
team and manager ([`permission-model.md`](./permission-model.md) P5) is
answered no: it is the HR product's directory, outside WorkTrack's boundary
(§1).

**Area 8 — Whole-product review and finish.** A last pass over every page and
flow in the product, role by role and on a phone, for consistency, wording and
the details the earlier areas left: the point at which the product is judged
ready, or not, for the final stage.

**Order.** Area 1 came first and Area 2 straight after, because every later
area reuses what they settle; then Area 5, Area 6 and Area 7, with Areas 3
and 4 in steps between them (the Delivered table has the sequence). Report
figures that add up followed (PR #71), then one visual language and screens
that fit, moved ahead of access to teams on 10 November 2026 because UI/UX is
the top direction and the new access screens should land on settled patterns;
access to teams (Configurable permissions, below) comes next; what is left of Areas 3 and 4, Team time and
Planning on a phone among it, follows, and Area 8 closes the stage. A defect
that distorts figures can be pulled into whichever work comes first.

---

**Next — Configurable permissions — an approximate vision, not a specification**

Scheduled on 7 November 2026, in two parts split by kind of access. **Access
to teams** comes next, after one visual language and screens that fit: someone
given it acts for a team (its time, absences, plans and reports), for
example a deputy while the manager is away, which PR #70's one manager per
team makes necessary. **Access to the owner's administrative tasks** comes
later, after the other quality work. Each part's design settles the details
when it starts.

- The owner may grant additional permissions to managers and employees, and a
  manager may grant selected ones to employees in the teams they lead, with
  less power than the owner; which ones, and on what rules, is settled with
  access to teams.
- A permission extends what someone may **do**, never **whose data** they may
  reach: reach stays defined by teams (D9, D10). A grant that would widen reach
  over people, such as managing teams, builds on the membership-dated reach of
  PR #63: a grant would be another source of dated reach
  ([`permission-model.md`](./permission-model.md) P4).
- Creating activities may be granted apart from renaming or archiving the
  shared activities and categories.
- Managing permissions stays simple and visually polished: a few
  plain-language switches on the person's panel rather than a permission grid
  or custom roles.
- Groundwork already in place: each owner-only area is enforced on its routes, so
  it can later become one grantable permission without a redesign.

---

**Final stage — Production launch — deferred until the product is ready**

Not scheduled. It starts only when the product has been reviewed and is judged
ready to use for real; until then there is no production environment by
decision, and the free development stand is enough.

- **A production environment** — a second copy of the frontend and backend on
  paid plans, a fresh database, and the company's own domain with its Google
  sign-in URLs registered. Nothing is copied from the stand.
- **Migrations as a real release step**, replacing the hand-run step from a
  laptop, which the free tier forces today.
- **Session handling at the edge** — the per-client sign-in limit that counts
  Cloudflare rather than the person, and the client IP and user agent a
  refresh through the proxy records, are settled against the production host.
  The sign-outs and the `/login` lockout were fixed in PR #53.
- **A release checklist**: environment variables, rollback, and the first
  deployment verified the way the stand's were.

*Depends on: the product being judged ready, and on §10 Q9 (hosting, domain and
timing), which is a business decision rather than code.*

---

**Deferred on purpose.** Not scheduled, each waiting for a decision or a real
need: a `Client` entity (D8); reminders for incomplete weeks (§10 Q5); a dark
theme, which Area 2's shared tokens have unblocked; per-person working patterns,
a configurable working week, a
configurable grace period and closing a month early; your own list of sessions
and two-factor sign-in; and the open permission questions in
[`permission-model.md`](./permission-model.md) §5. By the
product boundary (§1): a team schedule for employees, their teammates' plans
and absences (P5, revisited only with the HR product); employees comparing
hours between people (no action for them, and against D3 and §3.4);
configurable visibility as Float has it (a code path per choice in every list,
for a choice nobody has made); and logging straight from the plan or copying a
day or a week (Area 3, only on evidence; a plan already opens the time form on
its project).

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
6. **Archive, never delete.** Projects, activities, categories and teams are
   archived, and users deactivated, so historical time stays resolvable.
   `ProjectActivity` rows are deactivated rather than removed for the same
   reason. Team membership closes with `leftAt` rather than deleting the row,
   and deactivating a person changes neither their team memberships nor their
   project memberships — active status gates joining, not staying. Only a deliberate removal ever takes someone off
   a team or a project.
7. **Aggregate in the database.** Client-side summing does not survive company
   scale.

---

## 9. Documentation map

The [README](../README.md#documentation) lists every document and what it
covers.

---

## 10. Open decisions

Questions about the permission model — team membership, invitations, team
structure, what employees see of their team — live in
[`permission-model.md`](./permission-model.md) §5, alongside the model they
belong to. The ones below are about the rest of the product.

Genuinely undecided. Each includes a recommendation, but none should be treated
as settled until confirmed. Answered questions are summarised at the end.

**Q5 — Should the app chase people who have not logged time?**
Nothing reminds anyone, and no screen marks a person short: Team time's
toolbar totals the people shown against what was expected of them (PR #67),
and Reports' People card shows each person against their expected hours.
*Direction from the product owner (October 2026): no reminders for now.*
People know they are expected to log, and frequent reminders would annoy.
Reconsider only on clear evidence that missing time is a real problem; a
weekly email to people with an incomplete week is then the smallest thing that
helps.

**Q6 — What happens to `Company.deletedAt` and `Company.currency`?**
Both are columns with no behaviour. `currency` should stay unused under D7.
`deletedAt` implies a soft-delete story nobody has written.
*Recommendation: leave both alone and revisit only if a real need appears.*
Area 1 removes currency from the screens and keeps the column; dropping it is a
later decision.
Removing columns costs a migration for no user-visible gain; the risk is someone
later assuming they work.

**Q9 — When, where and on what budget does WorkTrack go to production?**
Blocks the final stage only. Production needs paid plans (Vercel's free plan is
non-commercial, and the free backend sleeps), a domain from the company, and
Google sign-in URLs registered for it.
*Deferred by decision:* it is taken only once the product has been reviewed and
judged ready (§7, final stage). Nothing in the improvement roadmap depends on
it.

**Q16 — Can someone delete their own account, or an owner their company?**
Raised on 1 October 2026; no area yet. Nobody can delete an account today:
people are deactivated, never deleted (§8 rule 6). A user row also cannot be
removed by hand, since `project_users` refers to it without a cascade. If that
reference is lifted, deleting a person also deletes their time logs, absences,
plans and capacity, which changes the company's reports and its locked periods.
An employee's hours are the company's records, and the company decides what
happens to them.
*Recommendation:* no self-service deletion for employees and managers; the
owner deactivates people, as today. Deleting a company is the owner's case, and
it is decided together with Q6: what is exported first, how long data is kept, and
what `Company.deletedAt` means.
*Alternative:* "Delete my account" for any user, which then needs a rule for
their time logs, such as anonymising the person and keeping the hours.

**Q17 — Can ownership of a company be handed to someone else?**
A company has exactly one owner: `PATCH /users/:id` refuses `role: OWNER` and
the owner can't be deactivated (`users.service.ts`), so the company is tied to
one account and nothing replaces an owner who leaves. Deferred on 27 October
2026; a possible requirement before production, not yet decided
(4 November 2026). The design considered then, not agreed: one owner at a
time; the owner hands over to an active person who leads no team; the old
owner becomes a Manager; the successor is told in-app. No recovery procedure
for a lost owner account is written.
*Recommendation:* decide before the production launch whether it is required,
and design it then.

### Answered

- **Q1** — Absences respect period locking across their whole range (PR #20).
- **Q2** — Planning requires project membership (PR #23).
- **Q4** — The hours export is an Excel file, one row per person, day,
  project, activity and billing type, with no notes and a `Period` column
  (PR #32), and an `Email` column after the name (PR #49).
- **Q10** — Reports are one overview page for owners and managers, a month at a
  time at first (PR #49) and any period up to a year since PR #62, for the
  whole company or one team, built around the questions they bring: logged
  against expected and planned, and billable, week by week or month by month;
  what needs attention while a month can still change; people and projects as
  tables of their figures; the kind of work; a person or a project opened in a
  side panel; the export holds every number (PR #49). The change from the
  period before, added in PR #62, was dropped again, since part of a running
  period against a whole one says nothing.
- **Q11** — Employees get their own month on the Review my time page, from the hours and
  people reports opened to them and pinned to themselves; the export and the
  timeline stay closed (PR #51).
- **Q7** — A fifteen-minute access token with a thirty-day rolling refresh, and
  no "remember me" (PR #25).
- **Q8** — No email verification while only a company's first owner signs up
  directly; everybody else joins through an invitation that proves the address.
- **Q12** — Sign-up stays open for starting a company, behind a short, honest
  entry page; a Google sign-in from an unknown account is refused on the
  sign-in path and pointed to the invitation (Area 1).
- **Q13** — The owner does not lead teams; setup accepts an owner who manages
  everyone directly, with the manager steps optional (Area 1). Only a user with
  the Manager role can be a team's manager; Change manager makes an Employee
  of the team a Manager in the same change. Recorded in
  [`permission-model.md`](./permission-model.md) §3.2 and enforced since PR #33;
  §5 describes it.
- **Q14** — Expected starts on the day the person's account was created, in the
  company's time zone, with no new field; days before it expect nothing. Moved
  from Area 3 into Area 1's last piece of work (1 October 2026) and in force since; see
  §4. An explicit start date on the person stays the answer for a company
  that backfills older history.
- **Q15** — Time on a project with no client can be billable: project type and
  billable status are independent (D2). Internal work starts non-billable and
  can be switched on, and the reports and the export count
  billable by the flag on every project. Existing entries on internal projects
  were reset to non-billable by a data migration, so no past billable figure
  changed (PR #43).
- **Q3** — Company-wide structure is the owner's: teams (Area 1), and since
  PR #57 the activity and category catalogue and archiving or
  restoring a project. Managers create, edit and staff projects, which stay
  company-wide because a project spans teams. Configurable grants are
  scheduled in §7, access to the owner's tasks being their second part.

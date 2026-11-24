# WorkTrack — Product & Business Reference

The single reference for **what WorkTrack is, how its business rules behave
today, and what it is for.**

Companion documents: [`architecture.md`](./architecture.md) for the system
shape and where to start, [`permission-model.md`](./permission-model.md) for
who may do what and why, and [`workflow.md`](./workflow.md) for how a change
reaches `main`. This document explains the product those pieces serve.

**Status of this document.** Sections 1–6 describe behaviour verified against
the current code; §7 lists the constraints every change keeps.

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

### Who uses it, and for what

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
  about other people.

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

*Consequence.* `Absence` is its own table, separate from `TimeLog`, with a
date range so a two-week holiday is recorded once rather than fourteen times,
a fixed type and an owner. It exists so that a person and a report can see
*why* no time was logged. The rules are in §4.

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

*Consequence.* Write access is not "own entries only", so the boundary has to be
enforced in the service layer, from
the same team-leadership source as read visibility. Hiding a button is not a
permission.

Everything else about a time entry is unchanged. Period locking (D5) applies to
every role without exception; the daily 1440-minute ceiling, the project
membership requirement and the billability default all still hold, and they apply
to **the person the entry belongs to**, not to whoever is typing.

*Who wrote it is recorded, not a full history.* A time entry and
an absence keep who added them and who last changed them, and say so wherever
the record is read when that wasn't the person it belongs to (§4). A trace of
deleted entries or of every change stays out until someone needs it.

### D10 — A manager sees only their own teams, everywhere

An OWNER has company-wide visibility: every team, every person. A MANAGER sees
the teams they actively manage and the people in them, on the days they were
in them (a team keeps its history) — and that limit applies
to every list, not only to time data.

*Why.* A manager who may not read someone's time but could read their profile
or pick them out of a filter would see a boundary that looks arbitrary, and the
full roster.

*Consequence.* The user and team list endpoints are narrowed for managers.
Together with D9 this makes one rule cover both halves: a manager reads and
writes within their own teams.

*Staffing follows the same rule.* A manager assigns only the people they
manage, plus themselves — in `GET /users/assignable`, in `syncProjectUsers` and
in the one-person project links — and that set is all they see of a project's
membership, so sharing a project discloses nobody. See
[`permission-model.md`](./permission-model.md) §3.4 and §3.5.

**D10 has no exceptions.** A manager sees the people in the teams they lead, on
every list in the product. A project-level **responsible person** was
considered and rejected: responsibility in WorkTrack runs through teams, so
there is nobody to name. See [`permission-model.md`](./permission-model.md) §3.6.

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
├── Notification    recipient + type + subjectUser + readAt + details
│                   type: INVITATION_ACCEPTED | PLANS_REMOVED_BY_ABSENCE
│                   details: what an absence removed from someone's plans
│
├── ActCategory ──< Activity          defaultBillable
│
├── Project  (clientName: free text)
│     ├──< ProjectActivity >── Activity     which activities are allowed here
│     └──< project_users    >── User        who may log against this project
│
├── Absence         user + type + startDate + endDate + minutes + note
│                   type: VACATION | SICK_LEAVE | PUBLIC_HOLIDAY
│                   minutes: part of one day, null for whole days
│                   createdBy + updatedBy (who added it, who last changed it)
│
├── TimeLog         user + projectActivity + date + minutes + isBillable
│                   createdBy + updatedBy (who added it, who last changed it)
├── PlanningEntry   user + project + date + plannedMinutes +
│                   createdBy + updatedBy (who made it, who last changed it)
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
The database holds both rules, and leading a team is that team's membership
(`roleInTeam = MANAGER`). Adding someone from another team is a move: the old
membership ends the day the new one starts, in one transaction, after the owner
confirms it. What follows from the two rules, and why, is in
[`permission-model.md`](./permission-model.md) §3.3.

**Change manager is the one way a team gets its manager**, from today: the
owner picks one of its members or a Manager in no team
(`permission-model.md` §3.2–§3.3). The current manager stays in the team as a
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
   needs both days. An entry outside the caller's reach is not found (404)
   when they try to change or delete it, as when they read it, so its id
   tells them nothing; absences answer the same way.
   The entry is always matched on `companyId` too. The rest runs in one
   transaction, after the owner's user row is locked.
2. **Period lock** — a write touching a `LOCKED` period is rejected (403). On
   update, both the old and the new date are checked, so an entry cannot be
   moved into or out of a locked period. Every write that a locked month
   refuses — time, absences, plans, working hours, a deactivation, a team
   change — names the month and says the owner can reopen it in Periods.
3. **No future date** — a time entry records work done (D6), so one dated
   after the company's today is rejected (400), for every role, on create and
   on update. An entry already in the future can be moved back or deleted.
   Absences may be booked ahead.
4. **Employed on that day** — a day after the person's last working day, or
   inside an earlier spell between a last working day and the first day back,
   is rejected (400, saying why), on create and when an entry moves to a new
   date (`assertEmployedOn`). The last working day itself stays open, and so
   does a day before the person's account was created, for time and for
   absences; only Planning closes those days.
5. **Project activity and membership** — the `ProjectActivity` must belong to
   the caller's company (404); the owner must be on its project, a
   `project_users` row for `(projectId, userId)` (400), so a valid
   `projectActivityId` for a project the owner is not assigned to is refused;
   and it must be active, on an ACTIVE project with an ACTIVE activity (400).

After them, a day a whole-day absence covers is refused (see Absences) and the daily
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
records, and older records (both empty), show nothing. If the
person edits after a manager, they become the last editor and the "changed"
part goes. Deletes leave no trace.

### Absences

An absence is a date range belonging to one person, with a type — vacation, sick
leave or public holiday — and an optional note. It covers whole days, or part
of one day. It is never a time entry and never appears in an hours total (D6).

Every write passes three checks:

1. **Write scope** — the same rule as time logs, through the same
   `assertCanWriteUser` helper, over every day of the absence: an owner
   records for anyone in the company, a manager for the people in the teams
   they lead on the days they were in them, an employee for themselves. An
   absence across a team move is read by both teams' managers and changed only
   by someone who reaches all of it, such as the owner; the screens open it
   read-only for anyone else and say who can change it.
2. **Period lock** — a new absence cannot touch a `LOCKED` period, and no
   change may alter a day an absence has in one. An absence that runs into a
   locked month keeps its days there; its open days can still move, and
   deleting it removes only those, trimming it to its locked days. Its reason
   and note stay as they are while any of its days is locked. One locked at
   both ends, or whose locked days lie apart with open days between, stays as
   it is. The refusal says the owner can reopen the month.
3. **The day is free** — no day of a whole-day range may already have logged
   time, and no day may already be covered by another absence, whatever its
   type, so a day holds one absence at most. Part of a day is measured against
   the day instead (below).

Who added and last changed an absence is recorded and shown as for time
entries (see Time logging).

The rule runs both ways: time logging is refused on a day a whole-day absence covers,
and when that day is a weekend inside it, the refusal says to split the
absence around the weekend. A whole-day absence also deletes its owner's plans
on those days (see Planning).
Each service reads the other's table directly rather than depending on it, and
both check inside the transaction that locks the owner's user row, which is what
stops two concurrent writes from each seeing a free day.

**Part of a day.** An absence of one day can cover part of it, in whole
minutes (the form steps by five); the database allows minutes only on a
one-day absence. The day must have working hours, the part must be shorter
than the person's working day, and it must fit what is left of the day once
the time logged on it is counted. These limits are measured again only when
the day changes or the hours grow, so time logged afterwards stays allowed and
shows as over, and the absence can still be shortened. Time can be logged on that day, its plans stay, and nobody is
notified. There are three fixed types, a database enum rather than a
per-company list.

A range is refused whole rather than partially, and the refusal names the
conflicting dates. A range lasts at most 366 days, the limit reports use. The
database backs the range up with a check constraint that
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
minutes, recording who created it and who changed it last. Unique on
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
   capacity of their own, the same day Expected counts — and a week, as set by
   `Company.weekStartDay`, above the person's **available** hours (capacity
   minus absences); part of a day away lowers that day's limit by its hours.
   Both refuse only a write that *raises* a total, so a day
   or week left over by a later absence or a lowered capacity is kept (a week
   over is flagged "Over by", below) and can always be reduced.
6. Nothing can be planned on a day the person wasn't employed, as for time
   entries (rule 4 there).

Plans are written in one way only, a period save, a single day being a period
of one day, and removed per project across a period, never one by one. A day a
whole-day absence covers is skipped, and so is a day before the person's account
was created, which Planning shows closed. On a day with part of it away, a
period plans only what is left, filling its projects in order, the last ones
giving way — one left no room loses the plan it had there — and its preview
names the day. Recording a whole-day absence, or
widening or moving one, deletes that person's plans on its days, whoever records it — the
person themselves included, though they cannot write planning otherwise.
Plans on its days in a locked month stay, as those days do, and deleting or
shortening an absence brings nothing back. Whoever changed each removed plan
last, or made it when nobody did, is told in-app, unless they recorded the
absence: only about the plans on days
they can still read for that person, only while they are active, and never
naming the absence's type, so a notice reaches no further than they could
see.

**A period** is planned and changed in one form: a person and a date range.
The form lists each project already planned in the range with its days; new
hours for one of them apply only to the days that already have it, and a
project added fills every working day — the range's weekdays the person has
hours on, with no absence and not before their account was created. Plans for
projects left untouched stay. A listed project's plans in the range can also be
deleted from its row, after a confirmation, at once and in one go; that delete
reaches the same people a save does, and nothing in a locked month.
Saving applies to the result as a whole: a range touching a LOCKED month is
refused, and if any day or week would go over its limit, nothing is saved and
every day and week that does not fit is named; the form sums them up (how
many days go over the person's day, how many weeks over what they have
available, each with its worst). Only a total the write raises is refused. The same checks run without saving (a
preview), so the form shows the fullest day, what saving will add and change,
the absences skipped and every conflict before anything is written, and saves
only once everything fits.

The planning grid shows managers one figure of its own: **no longer fits**
(planned above available, flagged as "Over by" and never fixed automatically).
It is not shown to an employee, who sees only their own plan, and it does not
affect whether somebody is behind. A deactivated person's plans up to their
last working day stay visible in the grid, read-only; deactivating removes the
ones after it. The grid reads a week or a calendar month the same way: the
same people, days and figures, a month being only a longer range. It shows
working days only, since nothing can be planned on a weekend, and the period
form's hour pickers stop at the person's own day. "Add absence" in the period
form opens on one day: today when the period holds it, otherwise its first
working day.

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
| **Behind** | They logged less than expected | logged < expected, over finished days only. No screen labels a person behind: Reports' People table shows each person's logged time against expected, and that is all |

**Capacity** is a `UserCapacity` row: contracted minutes per week with the date
it takes effect, unique on `(companyId, userId, validFrom)`. An owner sets it
as **working hours a day**, in 30-minute steps up to 12h, and the week is that
day times five, so the API accepts only multiples of
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
Friday day in the range that no whole-day absence covers, less the hours of
part of a day away, from the day the person's
account was created in the company's time zone, each contributing a fifth of the
capacity in force that day, summed and rounded once at the end. Nobody is behind
for the days before they joined, and nothing is expected after their last
working day, nor, once they are reactivated, for the spell they were away, from
the day after their last working day to the day before their first day back
(kept in `user_inactive_periods`); there is no separate start date. Rounding once is
what keeps a full week away at exactly zero and a full week present at exactly
that person's capacity, for a part-timer as well as a full-timer. It returns
`total` for the whole range, `toDate` counting only days that have finished in
the company's timezone, which Reports' People card measures against, and a
figure for every date, which the timesheet draws each day's line and over-target
warning from. A day expects nothing on a weekend, a whole-day absence or before the
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
`PeriodLocksService` backs check 2 of Time logging.

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
(`Company.setupFinishedAt`). "Getting started" sits apart in everyone's menu:
for the owner the checklist while setup is open, and afterwards a guide to how
WorkTrack fits together with a day-to-day part (Team time, Planning, Reports,
Periods); for a manager and an employee a guide to their own role, each topic
linking to where it is done. A manager gets a welcome on Team time instead of a
checklist, and an employee one on their timesheet: a greeting and three items in
one row, those on another page linking to it; each speaks only to that person's
own role. An employee with nothing to log sees why — on no project, or
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
its first `OWNER` together; two companies with the same name signing up at the
same moment both succeed. Everyone else joins by **invitation**: an owner or
manager invites an email address with a role and, for an employee, a team, and
the invitee completes signup by setting a password or via Google. The owner's
Invite form starts on Employee; the setup checklist's link opens it on Manager. An owner may
invite a manager or an employee, a manager only an employee into a team they
lead. An employee invitation always names a team; an owner may also name a team
for a manager to lead, one with no manager and no other pending manager
invitation. That invitation holds the team's lead: Change manager waits until
it is accepted or revoked. There is no other way in: nobody is created directly.
Accepting an invitation that carries a team creates the team membership in the
same transaction that creates the user — a `MEMBER` for an employee, the team's
`MANAGER` for a manager. Only the owner invites managers and only the owner
appoints a team's manager, so this is not a second route to leading a team. The same transaction tells whoever answers for the new
person that they joined, so they can put them on a project: the owner who
invited them, otherwise the team's current manager, who is the inviting
manager while they still lead it, and only someone active, so nobody when the
team has no active manager. It is an in-app notification only, and each person
reads only their own. An
absence that removes someone's plans tells them too (see Planning).
A notification is deleted 60 days after it was read; unread ones are kept.
Invitation tokens are stored hashed and are `PENDING | ACCEPTED | REVOKED`;
an acceptance, a revoke and a resend at the same moment take turns, so an
accepted invitation can't be revoked and a revoked one can't be accepted.

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
belongs to. A manager gets one answer for any address outside their teams — an
account here or elsewhere, or a pending invitation they don't see: "This
address can't be invited. If they already work here, ask the owner to add them
to your team." The owner keeps the exact reasons. A link that cannot be used says why — expired,
revoked, already accepted, unknown, or for an address that has since gained an
account — and, when expired or revoked, whom to ask. Someone already signed in
who opens a valid link is not offered the form: accepting would create another
person's account, so the page names both addresses and offers to go back to
WorkTrack or to sign out and accept.

Everywhere a password is chosen — sign-up, invitation, reset, Settings — the rule
is 8–100 characters with an upper-case letter, a lower-case letter and a digit;
an existing password is checked for presence and the same 100-character cap, so
every password can still sign in. Names are 1–100 characters and
company names 2–100 characters of any kind, without line breaks or invisible
characters. Sign-in says that an account is deactivated or a company suspended
only after a correct password. Asking for a password reset answers such an
account as any other ("If this account can sign in to WorkTrack, a password
reset link is on its way") but sends nothing, and a link sent before is
refused with the sign-in message when it is used, and every Google path refuses an address Google
has not verified. "Continue with Google" on the sign-in
page signs in only accounts WorkTrack knows; an unknown one is pointed to the
invitation email, and only the sign-up page starts a company; when Google
doesn't share a first or last name, that page asks for it before the company's
name. A failed Google
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
an OWNER, so a company has exactly one owner, and ownership cannot be handed
over. A deactivated person keeps their teams and projects but cannot be
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
| Users — roster | list, read and edit anyone, change a role, deactivate and reactivate; nobody is created directly (see Invitations) or deleted | list + read, within their teams | own profile only |
| Users — assignment list | whole company | the people in teams they lead, plus themselves | — |
| Invitations | create, any role, an employee always into a team, a manager optionally to lead a team that has no manager or pending manager invitation; list, resend and revoke any pending one | create, EMPLOYEE only, always into a team they lead; list, resend and revoke the employee ones into teams they lead | — |
| Notifications | own only: read, mark read | own only: read, mark read | own only: read, mark read |
| Teams | create, rename, archive and restore, including a member's move, addition or removal dated back to an open day, and each team's one manager through Change manager; the Teams page is theirs alone | read, within their teams (filters and team links); remove a member (not a team manager) from the person's panel, from today | — |
| Projects | create, edit, staff anyone, choose activities; archive and restore are theirs alone | create, edit, staff their own people, choose activities from the catalogue | only their own, through `GET /projects/me` and `GET /projects/me/activities`, with the client name; the client name also on their own time entries |
| Activities, Categories | create, edit, archive and restore | read | read |
| Time logs — read | whole company | own, plus users in teams they manage | own only |
| Time logs — write | whole company, a deactivated person's days before they left included | own, plus users in teams they manage, the same way | **own only** |
| Absences — read and write | as time logs | as time logs | own only |
| Planning — read | whole company | own, plus users in teams they manage | own only |
| Planning — write, a period (a day is a period of one day), and its preview | any active user | self + managed users | — |
| Reporting periods | reopen + close | read | read |
| Hours and people reports | whole company | own, plus users in teams they manage | own only, through the same routes |
| Working hours | a person's hours and the company's standard day: set, schedule and cancel a change | own expected hours only | own expected hours only |
| Setup wizard and checklist | theirs alone | — | — |
| Hours export, timeline | whole company | own, plus users in teams they manage | — |

This matrix is what the code does today. Why it is shaped this way —
Owner-owned structure, manager-operated teams — is in
[`permission-model.md`](./permission-model.md).

**Manager scope comes from team leadership, not from the role.** A MANAGER who
leads no team sees nobody else and edits nobody's time but their own; like
everyone, they always read their own time logs, absences, plan and hours.
Scope is computed by date from the `TeamMembership` rows of the teams they
lead now (`roleInTeam = MANAGER`, still open); the lists that are about now
(People, pickers, project rosters) read current membership. How a team keeps
its history after a move is in
[`permission-model.md`](./permission-model.md) §3.3.

`TimeLogsService` shares one scope check between reads and writes, so the two
cannot drift apart, and the Team time grid is where an owner or manager acts
on it. A deactivated person's last month can still be corrected by the same
people (`permission-model.md` §3.7).

**Team structure is the owner's**: creating, renaming and archiving a team,
adding or moving a member, changing its manager and dating any change back. A
manager may only remove a member who is not the team's manager from a team
they lead, from today. Only a user with the MANAGER role leads a team, and a
refused role change names the team they still lead. A team is archived only
once it is empty (no open membership, no pending invitation), is read-only
while archived, and is restored as it was. The reasons are in
`permission-model.md` §3.2–§3.3.

Company-wide structure is the owner's: teams, the activity and category
catalogue, archiving and restoring a project (which removes everyone's plans on
it), periods and settings. Managers create and edit projects company-wide,
staff them with their own people and choose their activities from the catalogue.

---

## 6. What the product does today

Every part below is built and works end to end. Planning and Reports, the two
largest screens, have sections of their own after the list.

### Working end to end

- **Navigation** — an owner's and a manager's menu reads Team (Team time,
  Planning, Reports), My time (Log my time, Review my time) and Manage; My time
  is left out for someone with no hours today or ahead and no active project
  (`tracksOwnTime` on `GET /users/me`), and comes back without a reload when
  their own hours or projects change. An employee has Log my time and Review my
  time. The pages left out still open by address, and the phone header names
  every page.
- **Authentication and sessions** — email/password and Google, HTTP-only
  cookies, rotating refresh tokens that survive concurrent refreshes, password
  reset that signs you in, changing or setting your own password,
  invitation-based signup by password or Google. Rate limits count signed-in
  traffic per session and sign-in attempts per account. Sign-in takes only
  JSON bodies, so another site can't sign a browser in to its own account.
- **Log my time** (`/timesheet`, the employee's timesheet) — the most complete feature and the best reference for
  frontend conventions. Log, edit and delete time against assigned projects,
  driven by company work settings, with loading, error, empty and over-target
  states. A new entry starts from the last project and activity logged for
  that person, or the only one there is. A week says "Complete" when its logged
  time is exactly what was expected, and how far past it when it is over. One row of controls carries the
  week's figures, which open a breakdown (expected and the days off that lower
  it, billable, non-billable, how much is past expected and how much of that at
  the weekend), and an amber lock during a month's grace week. A day that expects
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
  searchable lists in name order, ignoring case and accents, a person found by
  every word of a full name; Teams, Activities, Categories and Periods are the owner's,
  so a manager's Manage menu is People and Projects, and an activity or
  category a manager opens from a project reads only. A row opens a shared side panel where every related name is
  a link and relationships are edited in place, and one confirmation dialog
  comes before anything risky. A project is client work, with a client suggested
  from those already used, or internal; an activity has a billable default and
  always a category. A project's panel lists its archived activities apart, and
  its archive dialog names whose plans from today on it removes.
- **Team time view** — owners and managers land on `/team` and read their
  people's week, a row each: the person, each day's entries as chips with the
  project and its hours (a plan in a lighter tint, shown up to today on a day
  nothing is logged yet; later plans are Planning's),
  and their week's hours against what was expected in a column on the right,
  as on Planning. Saturday and Sunday are left out unless someone shown has
  time on one, and open from Friday's heading. They correct the week in the
  grid: a chip opens that entry, the empty part of a day logs time for the
  person ("No time" on an empty past working day), and an absence is added
  from a day: from its Log time form, or from a day still to come. A search by name
  or position, a sort by name or by how
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
  and their entries correctable. Days follow the timesheet's look: a day over
  the person's hours on solid amber, a weekend with time in amber stripes.
- **Absences** — a person records their own days away from the timesheet, and
  an owner or manager records them for somebody from Team time or opens one
  from Planning. A form opened from a day is that day, whole or in part (Whole
  day, Rest of the day once time is logged, or Set hours), with "Add more days"
  for a range; a day with time logged offers only its part, and one already
  partly away opens that absence; the timesheet's own button takes a first and a last day,
  opening on the first working day it can take. Every date field greys out the
  days an absence can't take — time logged, another absence, a locked month —
  and the last day can't reach past one. The timesheet and the team grid mark
  whole days, and part of a day as a striped block as tall as its hours, so an
  empty week explains itself; Planning stripes the day under its plans.
- **Capacity and expected hours** — an owner sets somebody's working hours a
  day from a date, the week shown beside it, and the company's standard day the
  same way in Settings; a change waiting to start shows with Cancel. Both week views read one backend figure for what was expected,
  absences reduce it, and each shows logged time against it; no screen marks a
  person behind, by decision. At 0h a person's panel says "No fixed
  hours", and the week views show their hours alone, never over. The owner is
  listed in People to themselves only, and edits their own position and working
  hours on their panel; nobody else manages the owner's account there.
- **Closing periods** — each month locks by itself 7 days after it ends, and an
  owner can reopen a locked month from `/admin/periods` and close it again,
  each after a confirmation; the page lists the months back to the company's
  first and shows who last reopened or closed a month and when. The
  timesheet, team grid and planning grid show locked days as read-only, and
  during the grace week an amber lock on the timesheet, Team time and Reports
  says until when last month can be edited, on a hover or a tap. Reopening a
  month says that working hours still can't change from it while a later
  month is locked.
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
  selected range as an Excel file for invoicing (D7), with two sheets over the
  same finished days. `Time Entries` has one row per person (with their email
  after the name), day, project, activity and billing (Billable or
  Non-billable, by the entry's flag), in decimal hours, with no notes; the
  `Client` column is empty for internal work, one spelling is used per client,
  and a `Period` column says whether each row's month is still open to edits.
  `Employee Summary` has one row per person in the People table: their teams,
  expected, logged, the difference (empty when nothing was expected), billable,
  whole days off by reason, part-day absences in hours, and `Closed` once every
  month of the range is locked. A person's logged equals the sum of their
  entries. A manager's export, or one for one team, counts only that team's
  days of each person, so a company-wide summary is the owner's export with no
  team chosen. Names are written as text, so a name starting with `=` is never
  run as a formula.
- **Manager scope** — a manager's user, team and time lists all narrow to the
  teams they actively lead, and so does the list they staff from, plus
  themselves.
- **Onboarding** — the owner's setup wizard and checklist, which end once
  somebody can log time (§4, company settings), the welcomes on Team time and
  the timesheet, and Getting started for every role.

### Planning

**Month and week.** Owners and managers plan their people by project on
`/planning`, which opens on the current month, with `Month | Week` to switch;
the choice and the period shown are in the URL, so a link to a week still opens
that week. The month has a column per week, holding the month's working days
only, so an edge week can be a day wide: in each, a project's plan is a bar
across its days, named when it covers two days or more, over the days' grounds
(an absence striped, a day the row doesn't hold for the viewer closed), with
the week's hours only when they are short of or over what is available, in
amber when over. A week's cell opens that week. In the week, a plan repeated
with the same hours on days next to each other is one bar, its hours first ("6h
Customer Portal Redesign"); the days only show what is planned.

**Plan period.** Planning starts from the person: "Plan period", beside the
name when the person is pointed at, opens the period dialog on the week or
month shown, for a month at a time or any range, several projects with hours
per working day, with a preview of the working days, the absences skipped, what
is already planned and anything that does not fit before saving,
all-or-nothing; a `Week | Month` control beside its arrows sets what they step
by.

**Rows, filters and totals.** Each row reads planned against available hours
with a bar, the month in decimal hours as Reports ("136.5h"), saying "of …"
only when the two differ, and says which no longer fit ("Over by"). It is
narrowed as Team time is, by team, project (active ones only, since nothing is
planned on an archived one) and a search by name or position, with the same
"Clear filters" when nothing matches, and kept in the URL the same way. Under a
project the rows are the people on it or with a plan on it, each showing only
its plans and its hours ("on Acme redesign"). The toolbar totals the people
shown ("Planned 120h / 160h" against their available hours; the planned hours
alone under a project).

**Who is listed.** A week or month lists the people with working hours in it or
plans on it: someone at 0h shows only with plans left from before, marked "No
fixed hours", with nothing to plan; a leaver shows while they still had days in
it, the days after their last closed; someone who moved out of the team during
it is planned on their days in it. A week or month wholly in locked months
offers no "Plan period".

**Limits, and the plan on the timesheet.** A day can be planned up to the
person's own working day, in 15-minute steps, and an absence can be added from
the period dialog. A day's, a bar's and an over-plan figure's details show in
the same styled tooltip as Team time's. Everyone sees their own plan on the
timesheet until they log time that day, as light blocks in the project's colour
that open the time form on that project; recording a whole-day absence removes
the plans on its days.

### Reports

**Period and team.** Owners and managers see one overview on `/reports` for a
month, a quarter, a year or a custom range of up to 366 days, stepped with
arrows from the company's first month and kept in the address, and for one team
at a time: an owner any team, a manager who leads several any of theirs, the
export included. A badge names what the figures cover: the period once it has
ended ("October 2026", "Q3 2026"), and while it runs the days counted so far
("Nov 1 - Nov 7 so far").

**The band.** The band's three figures are time logged against what was
expected (capacity minus time off), what was planned against it, and billable
time against logged (by each entry's flag, D2), each with its share; nothing is
compared with the period before, since part of a running period against a whole
one says nothing.

**Week by week.** Below, week by week (month by month past 92 days, from the
company's first month, a week with no working day and nothing on it left out):
each column a pale block of what was expected with what was logged, its
billable part striped, planned standing beside it, time past what was expected
ending the column in the warning colour, with its figures on hover. A longer
period links to the months in it still open.

**Needs attention.** While a month is open, "Needs attention" says each kind of
problem once, in at most two cards, each name opening its panel: people with
working days with no time logged (in a month still running, only for weeks that
have ended, since many log their week on Friday), owners included, and projects
at least 8h and over a tenth off their plan, or client projects with 8h or more
and no plan (in a month still running, only over plan, since late logging only
lowers logged time). None is about somebody logging less than expected; a plan
beyond someone's hours is Planning's to warn about. A locked month is for
reference and marks nothing.

**Who is listed.** Reports report working time, not absences: a person is
listed when, on the days the view holds them while employed, they had working
hours (before time off) or logged or planned time, whatever their role or
status; time off lowers what is expected and counts as days off only on days
with working hours, part of a day away as hours beside them ("3 days · 2h
25m").

**People.** People is one table, each person once with their figures on the
days the view holds, so the rows add up to the band: Logged, Expected, the
share of expected with a bar (billable striped, time past expected in the
warning colour) and Billable as a share of logged. Under a person's name is
their position, with "Last day" and the date for a leaver or, under a team
filter, "Joined" or "Moved out" and the date in the same line. It opens on the
people furthest from what was expected, either way, those expected to work
nothing last; any column sorts from its header, and the first ten show until
the rest are asked for.

**Where the time went.** Where the time went switches between projects and the
kind of work: projects as a table of Logged, Planned, the difference with a bar
("+71.5h", "0h", "no plan") and Billable, most logged first, or logged time by
activity category, the five largest each in a colour of its own and named with
its hours, the rest in an "Other" that opens. Where a card is too narrow for
the columns, beside an open panel or on a phone, each row is the name with its
main figure, a short note and the bar.

**Marks and figures.** The one mark is a dot beside what Needs attention names.
Figures are in decimal hours, up to two decimals ("1,412.5h"); the export keeps
exact time. It is a fact, not a score (D3): nothing is red or green.

**A person's and a project's panel.** A person's name opens their whole period,
under a team filter too: logged against expected, their plan, billable time,
days off and days with no time logged, each marked in the chart's colours,
their teams in date order with their days and figures (a team archived since
says so beside its days, "No team", or "My time" for the viewer's own days
outside the teams shown), and their projects against plan, with a link to Team
time; a project's name opens its billable time and its people against their
plans.

**Scope.** Everything counts finished days only (§4, capacity and expected
hours). Managers see only the team they lead, and choose a team only if they
see more than one; in another person's panel they see only their team's part.

### Interface conventions

Rules the screens share, written here because no single component holds them.

- **Words.** Pages are named by what you do there (Log my time, Review my
  time, Team time). Delete means a record is gone for good (a time entry, an
  absence, a plan); Remove means a link ends and both sides stay (a person
  from a team or a project, an activity from a project); Archive means out of
  use and kept whole. Dates read in US English whatever the browser's
  language.
- **Marks.** A pill marks only what someone has to act on (No team, No active
  manager, Expired, Closing soon, Reopened), in amber so a warning never reads
  as an error; a fact (Deactivated, Archived, Locked, Open, a role) is quiet
  text. One teal bar marks where you are (the menu, the open row, today, the
  selected tab), and pointing at something only darkens it slightly, so the
  two never look alike.
- **Toolbars.** A page with a period has one toolbar: the period control on
  the left, the total on the right as "Logged 30h / 128h" with a bar, actions
  last; it stays while the content loads, and a part that fails to load says
  so with Try again.
- **Week grids.** Logged time is a strong tint of its project's colour with
  its dot and dark text, a plan a light tint with no edge or dot, the same in
  every week view; every entry names its hours before its project, and a plan
  repeated over several days is one bar. A day that can be changed is white
  and a locked one grey. Every project has its own colour, from ten made for
  the product.
- **Dialogs.** No dialog has a close button in its header: it closes from its
  footer, "Cancel" in a form and "Close" in a read-only one and in
  Notifications. Escape and a click outside ask first while a form has unsaved
  changes, the management create dialogs included, and do nothing while a save
  runs. The work dialogs (Log time, an absence, Plan a period) share one
  frame: the action as the title, who and when beneath, and Delete as a quiet
  button apart from the one solid primary action. Leaving Settings with
  unsaved edits asks first too, by a link, a reload or a closed tab; the
  browser's Back can't be stopped.
- **Confirmations.** A confirmation's title is a question, and "This can't be
  undone." is said once. The confirm button is red when something is lost that
  Restore can't bring back, amber when it can be undone but reaches further,
  the brand colour when it is routine, and green for Restore and Reactivate.
  What has to happen first blocks an action and says so (archiving never
  removes people, links or invitations), and an action that removes plans
  names them first.
- **Figures are plain hours.** No utilisation ratios and no scores: one bar
  per row against expected or planned hours, since a ratio per person reads as
  a score (D3).
- **Look.** The screens people work in carry no shadows, glows, gradients or
  icon tiles; figures are set in aligned digits and no heading is in capitals.
  Colours and type come from the tokens in `apps/frontend/app/globals.css`.
- **Left out on purpose.** Zoom levels in Planning (the month is the one wider
  view needed), scrolling a week sideways instead of the arrows, project hour
  budgets, and a side panel beside the Team time grid.

### Fields that exist but do nothing

| Field | Status |
| :--- | :--- |
| `Company.currency` | Read by no logic and no longer asked for or shown. **Should stay unused** under D7. |
| `Company.deletedAt` | Column with no soft-delete behaviour behind it. |
| `PlanningEntry.note` | Kept on older plans; no screen or route reads or writes it. |

### Engineering state

The backend tests run mostly against a real database. They cover the roles of
every route (a test that lists each route with the roles it allows fails when a
route's access changes), reach by team membership dates, and the time,
absence, capacity, planning, locking, report and session rules. The frontend's
Vitest suites cover its date, lock and time zone helpers and the main screens'
components in jsdom. GitHub Actions runs the formatting check, lint with no
warnings allowed, typecheck, build and tests for both applications on every
pull request.

The backend has a production image (`apps/backend/Dockerfile`); the frontend is
built by its host. A shared development stand runs on Vercel, Render and Neon on
free plans, with migrations applied by hand; there is no production environment,
by decision, until the product is ready. The stand is for development and
testing only: no public production domain, test data, no real end users, and no
real-user rollout planned in the near future.

Access tokens live fifteen minutes and refresh tokens thirty days. A page holds
at most 100 rows and a larger request is refused; views that need a whole list
fetch it page by page. Reports and date-range figures cover at most 366 days. A date is accepted
from 2000 to 2100, and input the database can't hold is refused (400).

---

## 7. Constraints that must survive every future change

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

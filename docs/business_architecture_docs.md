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

**Last verified against the code: 25 September 2026**, and reconciled again
with Phases 11, 12 and 13. Phases 0 to 13 of the roadmap in §7 are delivered,
and so is the permission model. The work ahead was re-planned on 28 September
2026 as a high-level improvement roadmap (§7); the production
launch is a final stage that starts only once the product is judged ready.

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

**Built in Phase 2.** `Absence` is its own table with a date range, a fixed type
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

*Why.* The rule held for time logs, planning and reporting, but `GET /users`
and `GET /teams` used to hand a manager the whole company. A manager who may not
read someone's time could still read their profile and pick them out of a
filter, which made the boundary look arbitrary and exposed the full roster.

*Consequence.* The user and team list endpoints are narrowed for managers.
Together with D9 this makes one rule cover both halves: a manager reads and
writes within their own teams. It settles the read half of §10 Q3.

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

**What a project offers.** A project's activity list is what people may log
against there: an activity enabled on the project, and active in the company's
catalogue.
- *Removing* an activity from a project takes it off that project's list at
  once, with no warning, even when time has been logged on it. Adding it again
  picks up the same link and history.
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
2. **Write scope** — the caller must be allowed to act for the entry's owner
   (D9), through `assertCanActForUser`: an owner for anyone in the company, a
   manager for the people in the teams they lead, an employee for themselves.
   The entry is always matched on `companyId` too.
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
specify it (D2). The time form starts a new entry from the chosen activity's
default, and the person can change it on each entry.

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

The planning grid shows managers two figures of their own: **unplanned** hours
(available minus planned) and **no longer fits** (planned above available,
flagged and never fixed automatically). Neither is shown to an employee, who
sees only their own plan, and neither affects whether somebody is behind.

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
| **Expected** | How much somebody was supposed to work | capacity from the day their account was created, minus the days they were away |
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
Friday day in the range that no absence covers, from the day the person's
account was created in the company's time zone, each contributing a fifth of the
capacity in force that day, summed and rounded once at the end. Nobody is behind
for the days before they joined; there is no separate start date (§10 Q14). Rounding once is
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
hardcoding calendar assumptions. Currency is neither asked for nor shown (D7).
The time zone is any valid IANA zone except Russia's; the old name `Europe/Kiev`
is saved as `Europe/Kyiv`. The standard working day allows half hours. Slugs are
unique and regenerated on rename.

A new company's owner answers three questions in the setup wizard — time zone,
week start and working day — then follows a checklist whose steps end with
somebody able to log time: a team, a category and activities, a project with
activities, and at least one person on it, the owner included. Inviting a
manager is optional, so an owner who manages everyone can finish. Setup is a
one-time flow: once it is completed, or the owner skips it, it never starts
again, and changes to teams or projects later do not reopen it
(`Company.setupFinishedAt`). "Getting started" stays in the owner's menu: the
checklist while setup is open, and afterwards a guide to how WorkTrack fits
together. A manager gets a welcome on Team time instead of a
checklist, and an employee one on their timesheet; each speaks only to that
person's own role. An employee with nothing to log sees why — on no project, or
on projects with no activities yet — and no "behind" for that week. Team
time and Planning always show their people, the viewer included, even before
anybody has logged or been planned; when the viewer is the only one there, a
line says why — nobody else has joined, or the manager leads no team or an
empty one.

An active activity always belongs to an active category. A category that still
has active activities is archived only by moving them to another active category
or archiving them with it, and an activity whose category is archived is
restored only by restoring the category too or moving the activity. Restoring a
category can restore all of its archived activities with it, or the category
alone. Archived projects, activities and categories, like archived teams, are
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
for a manager to lead. There is no other way in: nobody is created directly.
Accepting an invitation that carries a team creates the team membership in the
same transaction that creates the user — a `MEMBER` for an employee, the team's
`MANAGER` for a manager. Only the owner invites managers and only the owner
appoints a team's manager, so this is not a second route to leading a team. The same transaction notifies whoever sent the invitation, if they
are still active, that the person has joined, so they can put them on a project;
it is an in-app notification only, and each person reads only their own.
A notification is deleted 60 days after it was read; unread ones are kept.
Invitation tokens are stored hashed and are `PENDING | ACCEPTED | REVOKED`.

An invitation is valid for seven days, a product rule rather than a setting. Its
email names the company, the sender, the role and the team. A failed invitation
email leaves no invitation behind. Pending invitations can be listed, resent and
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
only after a correct password, and every Google path refuses an address Google
has not verified. "Continue with Google" on the sign-in
page signs in only accounts WorkTrack knows; an unknown one is pointed to the
invitation email, and only the sign-up page starts a company. A failed Google
sign-in returns to the page it started from with a message, never an error on the
backend's host. Archiving a team
revokes its pending invitations and closes the team (§5).

Users are deactivated, never deleted (`ACTIVE | DEACTIVATED`); the screens say
Deactivate and Reactivate. A user cannot deactivate themselves, an OWNER account
cannot be deactivated, only an OWNER may modify another OWNER or grant the
OWNER role, and nobody changes their own role, so a company always keeps its
owner. A deactivated person keeps their teams and projects but cannot be
added to a team or a project.

---

## 5. Roles and permissions

`OWNER | MANAGER | EMPLOYEE`. There is no `ADMIN` role.

| Area | OWNER | MANAGER | EMPLOYEE |
| :--- | :--- | :--- | :--- |
| Company settings | read + update | read | read |
| Users — roster | full CRUD | list + read, within their teams | own profile only |
| Users — assignment list | whole company | the people in teams they lead, plus themselves | — |
| Invitations | create, any role, an employee always into a team, a manager optionally to lead one; list, resend and revoke any pending one | create, EMPLOYEE only, always into a team they lead; list, resend and revoke the employee ones into teams they lead | — |
| Notifications | own only: read, mark read | own only: read, mark read | own only: read, mark read |
| Teams | full CRUD | read, within their teams; remove a member | — |
| Projects | full CRUD | full CRUD | only their own, through `GET /projects/me/activities` |
| Activities, Categories | full CRUD | full CRUD | read |
| Time logs — read | whole company | own, plus users in teams they manage | own only |
| Time logs — write | whole company | own, plus users in teams they manage | **own only** |
| Planning — read | whole company | own, plus users in teams they manage | own only |
| Planning — write | any active user | self + managed users | — |
| Reporting periods | reopen + close | read | read |
| Hours report and export | whole company | own, plus users in teams they manage | — |

This matrix is what the code does today. The intended model —
Owner-owned structure, manager-operated teams — is in
[`permission-model.md`](./permission-model.md) §3.

**Manager scope comes from team leadership, not from the role.** A MANAGER who
leads no team sees nobody else, and under D9 may therefore edit nobody's time but
their own; like everyone, they can always read their own time logs, absences,
plan and hours. Scope is computed from active `TeamMembership` rows with
`roleInTeam = MANAGER`, so it follows team changes automatically and respects
membership history.

D9 is implemented: `TimeLogsService` shares one scope check between reads and
writes, so the two cannot drift apart, and the team view's per-person panel is
where an owner or manager acts on it.

Team structure is the Owner's: only an owner creates, renames or archives a
team, adds a member or changes a `roleInTeam`. A manager may remove a member
from a team they lead, because removal only narrows their own reach.

Only a user with the MANAGER role can be a team's manager; the Owner, who already
acts for everyone, cannot. To give an employee a team, the Owner first makes them
a Manager. A Manager who leads a team cannot be changed to another role until
they no longer lead it, and the refusal names the teams. Archiving a team ends every open
membership on the company's today, so its former manager loses reach from that
day; an archived team is read-only, and restoring it brings it back with no
members.

Note that MANAGER still has full CRUD over projects, activities and categories
company-wide — not restricted to their own teams. See §10 Q3.

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
- **Employee timesheet** — the most complete feature and the best reference for
  frontend conventions. Log, edit and delete time against assigned projects,
  driven by company work settings, with loading, error, empty and over-target
  states.
- **Admin CRUD** — users, teams, projects, activities and categories. A project
  is client work, with a client suggested from those already used, or internal;
  an activity has a billable default.
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
- **Hours export** — from the Hours tab, owners and managers download the
  selected range as an Excel file for invoicing (D7): one row per person, day,
  project, activity and billing type, in hours and minutes, with no notes. The
  people and totals are the Hours report's, one spelling is used per client, and
  a `Period` column says whether each row's month is still open to edits. Names
  are written as text, so a name starting with `=` is never run as a formula.
- **Manager scope** — a manager's user, team and time lists all narrow to the
  teams they actively lead, and so does the list they staff from, plus
  themselves.
- **Onboarding** — the owner's setup wizard and checklist, which end once
  somebody can log time (§4, company settings), and a manager's welcome on Team
  time.

### Decided while building, and still in force

- **`/team` stays a summary grid**, not a team timesheet. The grid is for
  scanning who logged and how much, the timesheet for what one person's week
  consisted of. "Where did the time go" is answered by the project filter, the
  per-person panel and the hours report.
- **Reports are for owners and managers.** Planned vs actual is readable
  through the API by an employee for their own figures, but no employee screen
  shows it.
- **Utilisation has four figures** — billable utilisation, client share,
  non-billable client share and logging completeness. Billable hours over
  *capacity* was left out as unfair per person.
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
rule everywhere — the people in the teams they lead, plus themselves.
[`permission-model.md`](./permission-model.md) describes the model.

### Engineering state

Backend test coverage is thirty-four suites and 534 tests, covering the
role-visibility filters, team and invitation rules, the Google callbacks and
notifications, time-log, absence, capacity
and planning rules, monthly locking in and outside UTC, the reports and the
export, page and date-range limits, name checks, and session refresh, rate
limits and token clean-up — most against a real database. The frontend has
Vitest tests for its date, month, absence, lock and paging helpers, the report
range check, tab keyboard navigation and download file names, and component
tests in jsdom for the sidebar, the phone menu and sign-out. GitHub Actions runs the formatting check, lint with no warnings
allowed, typecheck, build and tests for both applications on every pull
request.

The backend has a production image (`apps/backend/Dockerfile`); the frontend is
built by its host. A shared development stand runs on Vercel, Render and Neon on
free plans, with migrations applied by hand; there is no production environment,
by decision, until the product is ready (§7).

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

Built from August to October 2026, one branch and one pull request per phase.
The rules each one settled are in §2 and §4–§6; the detail of how each was built
is in its pull request.

| Phase | What it delivered |
| :--- | :--- |
| 0 | Authorization gaps in project routes and planned vs actual closed; first tests |
| 1 | Team time view at `/team`, with a per-person panel owners and managers edit through |
| Scopes C–E | The permission model — see [`permission-model.md`](./permission-model.md) §7 |
| 2 | Absences as date ranges, separate from time (D6) |
| 3 | Capacity from a date, and one Expected figure: capacity minus absences |
| 4 | Planning by project per person per weekday |
| 5 | Months that lock by themselves, and the `/reports` page |
| 6 | Sessions that stay up, per-person rate limits, changing your own password |
| 7 | Recoverable invitations, and every employee joining into a team |
| 8 | Page and date-range limits, exact name checks |
| 9 | CI that checks formatting and lint strictly; frontend tests |
| 10 | A local environment that runs what is on disk, checked from a clean clone |
| 11 | Week views and reports polish |
| 12 | Keyboard and screen-reader access, AA contrast |
| 13 | Excel export of hours |
| 14 | Company setup: a three-question wizard and an owner's checklist that ends with somebody able to log time; a manager's welcome; only Managers lead teams; archived teams closed; clients and billable defaults on the forms; local development on the host |
| 15 | Invitations, joining and signing in: seven-day invitations with a fuller email, expired ones kept and resendable; an invitation page that explains every link; Google failures back on WorkTrack pages; one password and name rule; no username or direct creation; a "joined" notification for the inviter |
| 16 | The rest of the first run: one look for every auth page; invitation links that handle a signed-in visitor and an address that already has an account; Expected from the day an account was created; first screens for each role that say why there is nothing to log, with role-focused welcomes; Team and Planning always showing their people; a manager invited to lead a team; activities that stay off a project once removed |
| 17 | Fixes left from the first run: active activities only in active categories, with simple archive and restore dialogs; a refused role change that saves nothing; stricter input checks; the password checked before account status; unverified Google emails refused; a race-free team addition; old read notifications cleaned up; the `username` column dropped |
| 18 | The application shell: navigation grouped into Work and Manage, with Getting started apart; an accessible phone menu that closes on navigation; one page frame and one page header; sign-out that clears every cached query; component tests |

### Improvement roadmap — high level, flexible

Planned on 28 September 2026 after a review of the code, the screens and the
documentation. WorkTrack is not considered ready for production yet, and this
stage is what makes it a better product first.

**How to read it.** The roadmap names the broad areas to improve and what each
covers. It deliberately settles no business decision and no implementation
detail: an area gets a detailed scope, with its own decisions, only when it is
picked up. Areas can grow, shrink, split into several phases or change as the
work teaches us something. Each phase that ships is still one area, one branch
and one pull request, numbered from Phase 14 on. The defects found so far are
listed against their area in the local known-issues document.

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

Every area also keeps accessibility at the level Phase 12 set, adds the tests
for what it changes, and updates the documentation it affects.

**Area 1 — First run and onboarding** *(first)*. Everything a new company and a
new person meet before WorkTrack is useful to them: sign-up, the company setup
wizard and the owner's and manager's checklists, inviting people and joining,
the first screen each role sees, empty states, and explaining WorkTrack's
concepts — teams, projects, activities, categories, billable work, capacity and
periods — where they are first met. Setup should end with a company in which
people can actually log time, which also means setting up projects and
activities properly, clients and billable defaults included. The public landing
and sign-in pages, the invitation email and the Google sign-in paths belong
here, as do the basics of a person's own account settings.

**Area 2 — Application shell and shared UI.** The frame every page sits in and
the parts every page is built from: navigation per role, the sidebar, header and
user menu, page layout and headers, and one version each of the table, card,
form field, select, dialog, confirmation, loading, empty and error patterns,
all built from the tokens in `globals.css`. It sets the standard the other areas
apply to their pages, so it may run alongside Area 1 or straight after it, and
it includes what the frontend needs to test components rather than only helpers.

**Area 3 — Everyday time entry.** The employee's timesheet and absences, the
screen people use most. Logging should be fast, with the plan, recent work and
common durations doing much of the typing; a week should say clearly when it is
complete; the figures it shows — billable, internal, expected — should mean the
same as everywhere else and start when the person started; and it should work
on a phone.

**Area 4 — Team oversight and planning.** The manager's and owner's week views:
the team grid, the per-person panel and the planning grid. Finding who is behind
and why, correcting somebody's week including their absences, planning more than
one cell at a time, and grids that draw days, absences and locks the same way.

**Area 5 — Administration and settings.** The owner's and manager's admin
screens — people, teams, projects, activities, categories, periods and company
settings. Lists that scale past a few dozen items with search that covers
everything, confirmations before anything is archived, forms and dialogs that
behave the same on every screen, and settings that say what a change will do.

**Area 6 — Reporting and insights.** What owners and managers learn from
`/reports` and the export. Which questions each role actually brings, and how
the answers are best shown — charts, drill-down from a client to its projects and
people, trends over months, a team view for the owner, sensible date presets —
together with the figures that can mislead today. To be reviewed with the people
who use the reports before it is scoped.

**Area 7 — The employee's own view.** What an employee can see beyond one week:
a report of their own hours, how their time and plan compare over longer
periods, and what they may see of their own team and manager
([`permission-model.md`](./permission-model.md) P5). Any change to who may see
what is a permission decision and is settled as one.

**Area 8 — Whole-product review and finish.** A last pass over every page and
flow in the product, role by role and on a phone, for consistency, wording and
the details the earlier areas left: the point at which the product is judged
ready, or not, for the final stage.

**Order.** Area 1 first, by decision. Area 2 early, because every later area
reuses what it settles. Areas 3 to 7 follow roughly in the order people meet
them day to day, and can be reordered; Area 6 and Area 7 need the most
discussion before they are scoped. Area 8 closes the stage. A defect that
distorts figures can be pulled into whichever scope comes first.

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
- **Session handling at the edge** — the `/login` lockout after a deleted
  session, a throttled refresh signing people out, and the per-client sign-in
  limit that counts Cloudflare rather than the person are all fixed or settled
  against the production host.
- **A release checklist**: environment variables, rollback, and the first
  deployment verified the way the stand's were.

*Depends on: the product being judged ready, and on §10 Q9 (hosting, domain and
timing), which is a business decision rather than code.*

---

**Deferred on purpose.** Not scheduled, each waiting for a decision or a real
need: a `Client` entity (D8); reminders for incomplete weeks (§10 Q5); a dark
theme, which Area 2 unblocks; per-person working patterns, a configurable
working week, a versioned company default capacity, a configurable grace period
and closing a month early; your own list of sessions and two-factor sign-in;
and the permission questions in [`permission-model.md`](./permission-model.md)
§6 other than P5.

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

| Document | Covers |
| :--- | :--- |
| **This document** | Product definition, business rules, decisions, roadmap |
| [`permission-model.md`](./permission-model.md) | The permission model, all of it enforced, and its open questions |
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
structure, what employees see of their team — live in
[`permission-model.md`](./permission-model.md) §6, alongside the model they
belong to. The ones below are about the rest of the product.

Genuinely undecided. Each includes a recommendation, but none should be treated
as settled until confirmed. Answered questions are summarised at the end.

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

**Q10 — What should the reports answer, and should they show charts?**
Belongs to Area 6. Today every report is a table; there is no chart library, no
drill-down from a client to its projects and people, no comparison with earlier
months and no breakdown by team.
*Recommendation:* review the three tabs with the people who use them before
changing anything, and write down the three or four questions each role brings
to `/reports`. The likely additions are hours per month over time, the billable
split as a chart, a team breakdown for the owner and drill-down from a row, using
one small chart library styled from the existing `--chart-*` tokens.
*Alternative:* keep tables only and add drill-down, presets and trends as table
columns.

**Q11 — Should employees get a report of their own hours?**
Belongs to Area 7. An employee sees one week at a time. The API already returns
their own planned vs actual, week summaries and expected hours; the hours report
and utilisation would each need their route opened to employees, pinned to
themselves by the visibility filter they already use.
*Recommendation:* yes — hours by project and activity, logged against expected
by week and month, and absences taken, for the employee alone. Opening the two
routes is a change to the §5 matrix and would be recorded as one.
*Alternative:* build it only from the routes already open to employees, with no
permission change and no billable split by project.

**Q15 — Is time on a project with no client ever billable?**
Belongs to Area 3. The reports count all time on a project with no client
as internal, whatever its billable flag (D2), but the timesheet's progress bar
and the week summary use the flag itself, so the same hours read "billable" on
the timesheet and "internal" in the report.
*Recommendation:* no — the time form does not offer "billable" on a project with
no client, and the timesheet shows the same three-way split as the reports.
*Alternative:* keep the flag free on every project and only relabel the
timesheet's bar.

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

### Answered

- **Q1** — Absences respect period locking across their whole range (Phase 2).
- **Q2** — Planning requires project membership (Phase 4).
- **Q4** — The hours export is an Excel file, one row per person, day,
  project, activity and billing type, with no notes and a `Period` column
  (Phase 13).
- **Q7** — A fifteen-minute access token with a thirty-day rolling refresh, and
  no "remember me" (Phase 6).
- **Q8** — No email verification while only a company's first owner signs up
  directly; everybody else joins through an invitation that proves the address.
- **Q12** — Sign-up stays open for starting a company, behind a short, honest
  entry page; a Google sign-in from an unknown account is refused on the
  sign-in path and pointed to the invitation (Area 1).
- **Q13** — The owner does not lead teams; setup accepts an owner who manages
  everyone directly, with the manager steps optional (Area 1). Only a user with
  the Manager role can be a team's manager; the owner changes an employee's
  role to Manager first. Recorded in
  [`permission-model.md`](./permission-model.md) §3.2 and enforced from Area 1's
  first phase; §4 and §5 change when it ships.
- **Q14** — Expected starts on the day the person's account was created, in the
  company's time zone, with no new field; days before it expect nothing. Moved
  from Area 3 into Area 1's last phase (1 October 2026) and in force since; see
  §4. An explicit start date on the person stays the answer for a company
  that backfills older history.

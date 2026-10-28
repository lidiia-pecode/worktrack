# WorkTrack — Permission model

**Status: delivered.** This document describes how responsibility and access
work, and every rule in it is enforced today. The last two, in §3.2 — the
team-manager role rule and archived teams — were confirmed and enforced in
September 2026 with the company-setup work of the improvement roadmap.
[`business_architecture_docs.md`](./business_architecture_docs.md) §4–§6 remain
the record of current behaviour; §6 below lists the questions still open.

It exists because the permission rules outgrew a decision entry. They span
company membership, invitations, teams, projects and time data at once, and
writing them as another `D`-numbered decision inside the current-state document
would have mixed what is true with what is intended.

Scope of this document: **who may do what, and why.** Everything else about the
product — what a time entry is, billability, absences, reporting — stays in the
business reference.

---

## 1. The problem this model solves

WorkTrack had one permission where the business has four.

`User.role` decides whether a route is reachable, and
`TeamMembership.roleInTeam = MANAGER` decides which people's data comes back.
That is the whole system. Because `roleInTeam` is the single source of
people-visibility, **any write path that can set it is a privilege-granting
operation** — and those paths used to be guarded only by "you are a manager
somewhere in this company".

The business actually distinguishes four things:

| Concept | Question it answers | Who owns it |
| :--- | :--- | :--- |
| Company membership | Who exists at all? | Owner, with managers able to hire |
| Organisational structure | Which teams exist, who leads them? | Owner |
| Operational membership | Who is in a team now? | Manager, within their team |
| Work assignment | Who is on which project? | Manager, within their people |

Collapsing these into one role check is why a manager could widen their own
visibility, and why an invitation could not place anybody anywhere. Scopes C and
D separated the first three. The fourth — work assignment — was Scope E, and is
separated too: both who may be assigned and what a caller may read of a
project's membership are checked against the caller.

---

## 2. Principles

1. **The Owner defines structure; managers operate within it.** The Owner
   creates teams and appoints their managers. Managers run the team day to day.
2. **The Owner must not be a bottleneck.** A manager hires into their own team
   without waiting for the Owner.
3. **A manager may bring a person *in*, but may not take a person who already
   belongs somewhere.** This is the rule that makes delegation safe — see §3.
4. **Teams and projects are independent axes.** A project never belongs to a
   team. Project membership, project access and team membership are separate
   concepts with separate permissions.
5. **Responsibility runs through teams, not projects.** A project is never
   owned by one person. Each manager answers for their own team's people and
   work, and the Owner is where a question that crosses teams goes.
6. **Access is enforced in services.** A hidden button is not a permission. This
   already holds for time logs and must hold for everything here.

---

## 3. The model

### 3.1 Company membership and invitations — delivered

An owner may invite a manager or an employee, a manager only an employee into a
team they lead, and an employee invitation always names a team. The details are
in [`business_architecture_docs.md`](./business_architecture_docs.md) §4
"Access".

The principle it rested on still governs the rest of this document: appointing a
manager is the Owner's act of delegation and cannot be self-propagating.

When an invitation is accepted, its sender is notified. A notification belongs
to its recipient alone: everyone reads and marks only their own, whatever their
role, and it names only the person who joined — someone the sender invited.

### 3.2 Team creation and manager assignment

Owner only. Creating a team, renaming it, archiving it, and setting anyone's
`roleInTeam` are all Owner actions. A manager cannot create the structure they
operate in.

**Only a Manager can manage a team** — confirmed and enforced in September
2026. A team's manager must be a user whose company role is MANAGER; an
EMPLOYEE cannot be made one, and neither can the Owner, who already sees and
acts for everyone. To give an employee a team, the Owner first changes their
company role to MANAGER, then makes them the team's manager. The API refuses
`roleInTeam = MANAGER` for anyone else, on adding and on changing a membership.
A Manager who manages no team may be changed to Employee or Owner; one who
manages a team may not, and the refusal names the teams — memberships never
change as a side effect. A closed manager membership cannot be reopened for
someone who is no longer a Manager either. In the member list, choosing Manager
for an employee asks once, then makes them a Manager and then the team's
manager, as two separate changes. The Owner may also invite a new Manager to
lead a team; accepting makes them its manager. That is still the
Owner appointing a team's manager, since nobody else can invite a Manager.

**Only an empty team is archived** — decided 27–28 October 2026, replacing
September's "archiving closes the team". A team can be archived only when it
has no open membership (members, its manager and deactivated people alike) and
no pending invitation; the API refuses anything else with 409. Archiving then
changes the status and nothing else, and restoring is its exact undo, so a
restore never hands reach back by itself. The Owner empties the team on its
panel: moves or removes members, removes the manager, removes deactivated
people and revokes invitations, each with its own confirmation, so every
change of reach is a separate, visible decision. An archived team is
read-only, and since it is empty it never blocks demoting its former
manager.

### 3.3 Team membership

A manager gains people by inviting them into a team they lead, and may remove
a member (`roleInTeam` MEMBER) from such a team, on the person's panel (the
Teams page is the Owner's); the Owner adds and moves
everyone else, and alone removes a team's manager, the caller included
(Phase 36). See
[`business_architecture_docs.md`](./business_architecture_docs.md) §5.

The guarantee this rests on constrains everything else:

A manager may **not** add an existing company user to their team. That is the
move that would hand them another manager's person — and with it that person's
entire time history. Moving someone between teams is an Owner action (P2).

**Why this is enough.** Because a manager only ever gains people who are new to
the company, there is no prior history for them to acquire retroactively. That
removes the need to bound visibility by membership dates, which would otherwise
have to be threaded through every query. See P4.

**A person is a member of exactly one team.** A Manager may lead any number
of teams, and may be a member of one team led by somebody else. Adding a
member of another team to a team is a **move**: the Owner confirms it, and the
old membership ends the day the new one starts, in one transaction
(`addMember` with `leaveCurrentTeam`; without it the API answers 409 naming
the current team). Answered 27 October 2026 (P1); the code enforced only "not
twice in the same team" before. Reopening a membership or switching one to
Member follows the same rule.

Reach comes only from leading a team: being a member of one grants nothing,
and only decides who oversees the member's own time. A team may have several
managers, who see each other as they see its members. Confirmed 28 October
2026 over the stricter alternatives (one manager per team, Managers never
members): those would add rules and role-change handling for no gain, and
company-level switches for them are not wanted (decision 5).

**The Owner is in no team**, as a member or a manager; the API refuses it.
Membership would give the Owner nothing (their own time, planning and reports
work without one) and would give that team's managers reach over the Owner's
records. Decided 28 October 2026.

### 3.4 People visibility

**One level, and one rule.** A manager sees the people in the teams they
currently lead, plus themselves. An Owner sees everyone in the company. Nobody
else's name, profile, time or plan is readable, on any screen, by any route.

Sharing a project grants nothing. A manager working on a cross-team project
reads their own people on it and no one else — not a name, not an avatar.

*This replaces an earlier two-level model*, which had an "identity" tier
disclosing name, position and avatar to anyone sharing a project. It was struck
in September 2026 when Scope E's rules were settled. The reason: D10 narrows
`GET /users` so that a manager cannot enumerate the company roster, and a
project route handing back the names it refuses is a way around that. One rule
with no exceptions is also cheaper — every future endpoint returning a person
would otherwise have to decide which tier it is at.

**What is given up, and why that is accepted.** A manager can no longer tell
who else is on a cross-team project, so "is the design work covered?" has to be
asked rather than read. They ask the Owner, who sees everyone. That is the
answer, not a stopgap: a manager answers for their own team's people, not for a
project's total staffing, and the Owner is the escalation path by design (§2).

**A count is not a roster, and stays whole.** Every role sees the project's true
total member count, and any screen listing fewer people than that says how many
are hidden and why. A count names nobody, so it discloses nothing the scoping
protects — while a scoped count would tell a manager a fully staffed project is
empty, which is worse than opacity.

Team-level composition — "4 from Design, 5 from Platform" — was considered as a
further step and declined in September 2026. It names nobody, so it would not
have reopened D10, but it would have given managers a way to reach each other's
teams directly and so route around the Owner. Reinstating per-person identity is
not the fix either. The scoped list, the true count, and the Owner are the whole
answer here.

### 3.5 Projects: creation, visibility and membership

**Projects stay company-wide for owners and managers.** Only people narrow;
projects do not.

Two alternatives were considered and rejected. Scoping projects by team is wrong
by construction, since projects span teams. Scoping them by membership makes a
project appear and disappear as staffing changes, and hides a project from the
manager whose team is doing the work the moment their last report rotates off.

**Project membership** is who may log time against the project. A manager may
add **only people they can see**; the Owner may add anyone. A cross-team project
is therefore staffed by each manager contributing their own people, which is
also how it works in practice. Managers and owners are ordinary members, so a
manager has a project of their own to log against.

Three further rules follow from §3.4 and are settled:

- **A manager changes only what they were shown.** Because their member list is
  scoped, their save adds and removes inside that scope and leaves everyone else
  untouched, and adding or removing one person on its own
  (`POST`/`DELETE /projects/:id/members/:userId`) outside it is refused. They
  cannot remove another manager's person from a project, even
  one who has clearly rolled off — that is the Owner's call, or that person's
  manager's.
- **A manager may always add themselves**, including one who currently leads no
  team and therefore sees nobody. Otherwise they would still have no project to
  log time against, which is the whole reason managers become members at all.
- **Active status gates joining, not staying.** Only an ACTIVE user may be newly
  assigned, to a project or to a team, and a closed team membership is not
  reopened for someone deactivated. Archiving someone leaves their existing
  project memberships — and
  their team memberships — exactly as they are, un-archiving restores nothing
  because nothing was taken, and only a deliberate removal ever changes them.
  This is "archive, never delete" (business §8) applied to `project_users`.
- **The member count stays whole.** A scoped list is still reported against the
  project's true size, per §3.4.

**Employees** see the projects they are assigned to, and no others. They read
each one's name, status and client name — the client name also on their own
time entries, including entries on a project they have since left — and nothing
about any other project.

### 3.6 A project has no owner

WorkTrack does not model one person as responsible for a project. A project
deliberately spans teams; each team's manager answers for that team's people and
their work, and a manager who needs to clarify something outside their own team
goes to the Owner.

A nullable `Project.responsibleUserId` was planned as Scope F and struck in
September 2026, before any code was written. One name would have flattened a
relationship that is per-team, and it would have kept by hand a fact the team
memberships already hold. If per-project rights are ever wanted, that is a new
decision, not a field waiting to be filled in.

### 3.7 Time-log visibility and editing

Unchanged from D9 and D10 in the business reference: an Owner for anyone in the
company, a manager for people in teams they lead, an employee for themselves.
This model does not change the rule; it changes what it takes to *become* the
manager of a person, which is what makes the rule trustworthy. Everyone reads
their own time logs, absences and hours, including a manager who leads no team.

**A leaver's last month can still be corrected.** A deactivated person's time
logs and absences are written by the same people as an active person's, in
open months and within their normal reach: the owner, and the managers of the
teams they are still on. Two guards hold for every writer: nothing can be
dated on or after the day they were deactivated, or inside a spell they were
deactivated for and came back from (the API answers 400 and says why), and
locked months stay locked. Planning is different: no new or changed plan for a
deactivated person, deletion allowed. Decided on 27 October 2026 (entity
lifecycle, decision 3); it reverses the Phase 31 rule that refused every
write for a deactivated person, which made a leaver's last month
uncorrectable without reactivating them.

**Planning follows the same people.** An Owner plans for any active user, a
manager for themselves and people in teams they lead, and an employee for
nobody — not even themselves. Everyone can read their own plan, including a
manager who leads no team, and sees their own row in the planning grid
(`GET /planning/week`), the Team week view and Reports' People card. Planning
a whole period (`POST /planning/period`), and its preview
(`POST /planning/period/preview`, the same checks without a write), reach the
same people. One write
outside planning removes plans: recording an absence deletes its owner's plans
on the days it covers, so an employee's own sick day clears their own plans for
it. That reaches only the absence owner's plans on those open days, and opens no
planning route to employees (decided 20 October 2026, Phase 32). The
removal count (`GET /planning/removal-count`) counts the same people a save may
remove. Removing somebody from a project deletes their plans for it from today
on, and since a save only removes people the caller was shown (§3.5), a manager
can never clear plans for someone outside their teams.

**Reports follow the same people.** The hours and people reports
(`GET /reporting/hours`, `GET /reporting/people`) are open to every role and
read through the same visibility: an employee gets their own figures alone,
with no team names, and a filter naming somebody else returns nothing. The
export and the timeline stay with owners and managers. Opened on 26 October
2026 for My time (Phase 35); the employee's own report was Q11 in the business
reference.

### 3.8 Delegation summary

The Owner keeps: structure, role grants, moving people, and everything a manager
can do. The manager gets: hiring into their team, running their team, staffing
their projects with their people. Neither can quietly become the other.

---

## 4. Worked example

**Cast.** Olivia (Owner). Mary and Mark (Managers). Team Alpha: Mary,
Daniel, Irene. Team Beta: Mark, Peter. Sophie, a new hire. *Retail Redesign*, a
project staffed from both teams.

| Situation | Behaviour |
| :--- | :--- |
| Olivia creates Team Alpha and appoints Mary | Allowed. Only Olivia can do either |
| Mary hires Sophie | Mary invites Sophie as an EMPLOYEE **into Alpha**. On acceptance Sophie joins Alpha and Mary manages her. No Owner involvement |
| Mary tries to invite a new MANAGER | Refused. Appointing managers is Olivia's |
| Mary tries to add Peter to Alpha | Refused. Peter already belongs to Beta; only Olivia moves people |
| Mary removes Irene from Alpha | Allowed. `leftAt` is closed; the row and the history stay |
| Mary opens *Retail Redesign* | Allowed — projects are company-wide. She sees Daniel, Irene and Sophie on it, and a count telling her others are there. She does **not** see Peter, not even his name |
| Mary staffs *Retail Redesign* | She may add Daniel, Irene, Sophie and **herself**. She may not add Peter — Mark or Olivia adds him |
| Mary saves *Retail Redesign* without Peter in her list | Peter stays. Her save only touches the people she was shown |
| Olivia deactivates Daniel | He stays on *Retail Redesign* and in Team Alpha. He cannot log time, because he cannot sign in. Mary and Olivia can still correct his time and absences for the open month, on the days before he left; nothing can be recorded from his leave day on (§3.7). Reactivating him changes nothing back, because nothing was removed |
| Mary wants to know who else is on *Retail Redesign* | She sees her own people and a true count. For anything on Peter's side of the work she asks Olivia — nobody is responsible for the project itself (§3.6) |
| Mary logs her own time on *Retail Redesign* | Allowed once she is a project member — managers are ordinary members |
| Mark opens *Retail Redesign* | Same rights as Mary. Projects are not owned by a team |
| Olivia does any of the above | Allowed, always |

---

## 5. How today differs

**Nothing differs.** Every rule in §3 is enforced in the services — team
structure by Owner-only routes, people visibility and staffing by
`TeamVisibilityService`, time logs and planning by their own scope checks that
call it.

Two things this model does *not* treat as gaps. Visibility is not bounded by
membership dates, and it does not need to be while §3.3 holds (P4). Projects are
company-wide for managers, which is intended rather than a defect.

---

## 6. Open decisions

Visible and deliberately unanswered; each waits for a real need.

- **P1 — Multi-team membership.** *Answered 27 October 2026: no.* A person
  is a member of one team; a Manager may lead several (§3.3). Adding a member
  of another team is a move, confirmed by the Owner. If one person often works
  under two managers at once, that is a visibility question (P8), not a reason
  for multi-team membership.
- **P2 — Delegating moves to managers.** Moving a person between teams is an
  Owner action. Whether a manager may ever do it, or request it, is open.
  *Deferred by decision.*
- **P4 — Should time visibility be bounded by membership dates?** Recommend no
  while §3.3 holds; revisit if transfers become common.
- **P5 — Should an employee see their own team and teammates?** *Answered 24
  October 2026: no.* Who is in a team, who manages it and who is away belong to
  an HR product's directory, outside WorkTrack's boundary
  ([`business_architecture_docs.md`](./business_architecture_docs.md) §1). An
  employee sees their own time and their own month, and none of anyone else's.
  Revisit only together with the HR product.
- **P7 — What happens to a team when its only manager leaves?** Still open. Scope
  D settled the neighbouring case only: an invitation sent by a manager who has
  since stopped leading the team still creates the membership.
- **P8 — Should project visibility ever narrow?** Not at this company size, and
  note the distinction §3.4 now rests on: the **project** is visible to every
  owner and manager, its **roster** is not.
- **P9 — What does an archived team mean for access?** *Answered in September
  2026, reversed 27 October 2026:* only an empty team is archived, so archiving
  grants and removes nothing, and restoring is an exact undo — §3.2. Archiving
  that closed every membership itself was dropped: it changed many people's
  reach in one click that nothing undid.

Open questions about absences, planning, export and notifications stay in
[`business_architecture_docs.md`](./business_architecture_docs.md) §10.

---

## 7. How the model was built

In September 2026, three permission scopes were built between Phases 1 and 2 of
the product roadmap. Scope C made team structure the Owner's and closed the
route by which a manager could widen their own reach. Scope D let a manager
invite an employee straight into a team they lead. Scope E scoped project
staffing and rosters to the caller and let managers and owners be project
members. A fourth, Scope F, would have named one responsible person per project;
it was cancelled before any code was written, for the reason in §3.6.

Two questions settled along the way. An invitation whose team is archived is
revoked with it, and if the team is archived while someone is accepting, the
person is still created and the Owner places them (formerly P6). There is no
responsible person on a project, so whether they must be a member is moot
(formerly P3).

Everything built afterwards — absences, capacity, planning, reporting and the
hours export — reuses D9's people through the same helpers, so a manager's
figures cover the teams they lead and an owner's the whole company. Reopening a
locked month is the Owner's alone. One rule was added on top in October 2026
(Phase 31): time and absences can be written for somebody else only while that
person is active (§3.7).

---

## 8. What this document is not

| For | Read |
| :--- | :--- |
| How the product behaves **today** | [`business_architecture_docs.md`](./business_architecture_docs.md) §1–§6 |
| System shape and where to start | [`architecture.md`](./architecture.md) |

What is being built right now, the defects no scope owns, and the modules,
routes and data model are covered by working documents that are deliberately
kept outside version control. They are not linked here because they exist only
in a local checkout.

When a permission rule changes, record the new rule in §3 and in the business
reference's §4–§5 in the same change.

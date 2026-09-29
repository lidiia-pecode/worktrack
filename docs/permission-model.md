# WorkTrack — Target permission model

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
someone who is no longer a Manager either. The member list offers the Owner a "make Manager" step for an
employee, which changes only the company role.

**Archiving a team closes it** — confirmed and enforced in September 2026.
A team holds no data of its own, so archiving it ends a unit of responsibility
rather than any work. Archiving ends every open membership, manager and member
alike, on the company's today, so the team grants nothing afterwards and its
history stays in the membership dates. The Owner sees who is affected before
confirming, and people left without a team are the Owner's to place. An
archived team is read-only. Restoring it brings it back with no members; the
Owner adds people again under the current rules, so a restore never hands reach
back by itself. An archived team therefore never blocks demoting its former
manager.

### 3.3 Team membership

A manager gains people by inviting them into a team they lead, and may remove
someone from such a team; the Owner adds and moves everyone else. See
[`business_architecture_docs.md`](./business_architecture_docs.md) §5.

The guarantee this rests on constrains everything else:

A manager may **not** add an existing company user to their team. That is the
move that would hand them another manager's person — and with it that person's
entire time history. Moving someone between teams is an Owner action (P2).

**Why this is enough.** Because a manager only ever gains people who are new to
the company, there is no prior history for them to acquire retroactively. That
removes the need to bound visibility by membership dates, which would otherwise
have to be threaded through every query. See P4.

For now **a person belongs to exactly one team.** Multi-team membership is P1.

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
  untouched. They cannot remove another manager's person from a project, even
  one who has clearly rolled off — that is the Owner's call, or that person's
  manager's.
- **A manager may always add themselves**, including one who currently leads no
  team and therefore sees nobody. Otherwise they would still have no project to
  log time against, which is the whole reason managers become members at all.
- **Active status gates joining, not staying.** Only an ACTIVE user may be newly
  assigned. Archiving someone leaves their existing project memberships — and
  their team memberships — exactly as they are, un-archiving restores nothing
  because nothing was taken, and only a deliberate removal ever changes them.
  This is "archive, never delete" (business §8) applied to `project_users`.
- **The member count stays whole.** A scoped list is still reported against the
  project's true size, per §3.4.

**Employees** see the projects they are assigned to, and no others.

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

**Planning follows the same people.** An Owner plans for any active user, a
manager for themselves and people in teams they lead, and an employee for
nobody — not even themselves. Everyone can read their own plan, including a
manager who leads no team, and sees their own row in the planning grid
(`GET /planning/week`), the Team week view and the utilisation report. The
removal count (`GET /planning/removal-count`) counts the same people a save may
remove. Removing somebody from a project deletes their plans for it from today
on, and since a save only removes people the caller was shown (§3.5), a manager
can never clear plans for someone outside their teams.

### 3.8 Delegation summary

The Owner keeps: structure, role grants, moving people, and everything a manager
can do. The manager gets: hiring into their team, running their team, staffing
their projects with their people. Neither can quietly become the other.

---

## 4. Worked example

**Cast.** Olena (Owner). Marta and Mykola (Managers). Team Alpha: Marta,
Dmytro, Iryna. Team Beta: Mykola, Petro. Sofia, a new hire. *Retail Redesign*, a
project staffed from both teams.

| Situation | Target behaviour |
| :--- | :--- |
| Olena creates Team Alpha and appoints Marta | Allowed. Only Olena can do either |
| Marta hires Sofia | Marta invites Sofia as an EMPLOYEE **into Alpha**. On acceptance Sofia joins Alpha and Marta manages her. No Owner involvement |
| Marta tries to invite a new MANAGER | Refused. Appointing managers is Olena's |
| Marta tries to add Petro to Alpha | Refused. Petro already belongs to Beta; only Olena moves people |
| Marta removes Iryna from Alpha | Allowed. `leftAt` is closed; the row and the history stay |
| Marta opens *Retail Redesign* | Allowed — projects are company-wide. She sees Dmytro, Iryna and Sofia on it, and a count telling her others are there. She does **not** see Petro, not even his name |
| Marta staffs *Retail Redesign* | She may add Dmytro, Iryna, Sofia and **herself**. She may not add Petro — Mykola or Olena adds him |
| Marta saves *Retail Redesign* without Petro in her list | Petro stays. Her save only touches the people she was shown |
| Olena archives Dmytro | He stays on *Retail Redesign* and in Team Alpha. He cannot log time, because he cannot sign in. Un-archiving him changes nothing back, because nothing was removed |
| Marta wants to know who else is on *Retail Redesign* | She sees her own people and a true count. For anything on Petro's side of the work she asks Olena — nobody is responsible for the project itself (§3.6) |
| Marta logs her own time on *Retail Redesign* | Allowed once she is a project member — managers are ordinary members |
| Mykola opens *Retail Redesign* | Same rights as Marta. Projects are not owned by a team |
| Olena does any of the above | Allowed, always |

---

## 5. How today differs

**Nothing differs.** Every rule in §3 is enforced in the services — team
structure by Owner-only routes, people visibility and staffing by
`TeamVisibilityService`, time logs and planning by their own scope checks that
call it.

Two things this model does *not* treat as gaps. Visibility is not bounded by
membership dates, and it does not need to be while §3.3 holds (P4). Projects are
company-wide for managers, which is the target rather than a defect.

---

## 6. Open decisions

Visible and deliberately unanswered. P5 is part of the improvement roadmap in
[`business_architecture_docs.md`](./business_architecture_docs.md) §7; the
others wait for a real need.

- **P1 — Multi-team membership.** For now one person belongs to one team.
  Allowing several raises: do both managers see them, and who may edit their
  time? *Deferred by decision.*
- **P2 — Delegating moves to managers.** Moving a person between teams is an
  Owner action. Whether a manager may ever do it, or request it, is open.
  *Deferred by decision.*
- **P4 — Should time visibility be bounded by membership dates?** Recommend no
  while §3.3 holds; revisit if transfers become common.
- **P5 — Should an employee see their own team and teammates?** Today they see
  neither — not their team's name, its members, nor what projects anyone else is
  on. Whether they should, and how much, is open.
- **P7 — What happens to a team when its only manager leaves?** Still open. Scope
  D settled the neighbouring case only: an invitation sent by a manager who has
  since stopped leading the team still creates the membership.
- **P8 — Should project visibility ever narrow?** Not at this company size, and
  note the distinction §3.4 now rests on: the **project** is visible to every
  owner and manager, its **roster** is not.
- **P9 — What does an archived team mean for access?** *Answered in September
  2026:* archiving closes the team and restoring brings it back empty — §3.2.
  Suspending the team and merely hiding it were considered and set aside.

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
hours export — needed nothing new here: it reuses D9's people through the same
helpers, so a manager's figures cover the teams they lead and an owner's the
whole company. Reopening a locked month is the Owner's alone.

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

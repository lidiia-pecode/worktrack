# WorkTrack — Target permission model

**Status: partly delivered.** This document describes how responsibility and
access *should* work. Nothing here is implemented unless
[`business_architecture_docs.md`](./business_architecture_docs.md) §4–§6 says so
— those sections remain the record of current behaviour. §5 is the crosswalk
from each rule to what stands in its way, and §7 is the order the rest is being
built in: Scopes C and D are delivered, and Scope E is in progress.

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
D separated the first three. The fourth — work assignment — is Scope E, and it
is now separated too: both who may be assigned and what a caller may read of a
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
5. **Responsibility is not the same as access.** Being responsible for a project
   is a label, not a permission grant.
6. **Access is enforced in services.** A hidden button is not a permission. This
   already holds for time logs and must hold for everything here.

---

## 3. The model

### 3.1 Company membership and invitations — delivered

Shipped in Scope C (the role rule) and Scope D (the team rule). Struck from this
model per §8; the behaviour is now recorded as current in
[`business_architecture_docs.md`](./business_architecture_docs.md) §4 and §5.

The principle it rested on still governs the rest of this document: appointing a
manager is the Owner's act of delegation and cannot be self-propagating.

### 3.2 Team creation and manager assignment

Owner only. Creating a team, renaming it, archiving it, and setting anyone's
`roleInTeam` are all Owner actions. A manager cannot create the structure they
operate in.

### 3.3 Team membership

Adding a newly invited person and removing someone from a team a manager leads
are **delivered** — Scope C and Scope D — and struck from the model per §8. See
[`business_architecture_docs.md`](./business_architecture_docs.md) §5 and §6.

What remains here is the guarantee those scopes were built to preserve, because
it constrains everything after them:

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

**What is given up, and the replacement.** A manager can no longer tell who
else is on a cross-team project, so "is the design work covered?" has to be
asked rather than read. Scope F's responsible person gives them a name to ask.

**A count is not a roster, and stays whole.** Every role sees the project's true
total member count, and any screen listing fewer people than that says how many
are hidden and why. A count names nobody, so it discloses nothing the scoping
protects — while a scoped count would tell a manager a fully staffed project is
empty, which is worse than opacity.

If that proves insufficient, the next step is team-level composition — "4 from
Design, 5 from Platform" — which also names nobody and so does not reopen D10.
Reinstating per-person identity is not the fix.

### 3.5 Projects: creation, visibility and membership

**Projects stay company-wide for owners and managers.** Only people narrow;
projects do not.

Two alternatives were considered and rejected. Scoping projects by team is wrong
by construction, since projects span teams. Scoping them by membership makes a
project appear and disappear as staffing changes, and hides a project from the
manager responsible for it the moment their last report rotates off.

**Project membership** is who may log time against the project. A manager may
add **only people they can see**; the Owner may add anyone. A cross-team project
is therefore staffed by each manager contributing their own people, which is
also how it works in practice. Managers and owners are ordinary members —
today they cannot be members at all, which is why a manager has no project to
log against.

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

### 3.6 Project ownership

A project may name a **responsible person**. It is a label: it says who to ask
about the project. It grants nothing and restricts nothing, and it does not have
to be a project member (P3).

If per-project rights are ever wanted, this field is the hook — but that is not
the current intent.

### 3.7 Time-log visibility and editing

Unchanged from D9 and D10 in the business reference: an Owner for anyone in the
company, a manager for people in teams they lead, an employee for themselves.
This model does not change the rule; it changes what it takes to *become* the
manager of a person, which is what makes the rule trustworthy.

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
| Marta is made responsible for *Retail Redesign* | A label. It gives her nothing she did not already have, and she need not be a member |
| Marta logs her own time on *Retail Redesign* | Allowed once she is a project member — managers are ordinary members |
| Mykola opens *Retail Redesign* | Same rights as Marta. Projects are not owned by a team |
| Olena does any of the above | Allowed, always |

---

## 5. How today differs

The gaps themselves are current-state facts and are recorded where current state
belongs — [`business_architecture_docs.md`](./business_architecture_docs.md) §6
"Authorization gaps". This table is only the crosswalk from a rule above to what
stands in its way.

The §3.1 and §3.3 rows are gone: those rules shipped in Scopes C and D and were
struck from §3, so there is nothing left to cross-walk.

| Rule | Today | Detail |
| :--- | :--- | :--- |
| §3.2 The Owner owns structure | **Already enforced** — the six team write routes are Owner-only | — |
| §3.4 One level of visibility | **Already enforced** — the project's member list is scoped to the caller and narrowed to identity fields | — |
| §3.5 Projects stay company-wide | **Already true** | — |
| §3.5 Assign only people you can see, plus yourself | **Already enforced** — `syncProjectUsers` takes the caller, and `/users/assignable` is narrowed to the same set | — |
| §3.5 A manager changes only what they were shown | **Already enforced** — the diff only adds and removes inside the caller's scope | — |
| §3.5 Active status gates joining, not staying | Saving a project with an archived member 404s; re-picking members drops them | business §6 gap 4 |
| §3.5 Managers may be project members | Stripped twice on the client — the picker filters, and the submit filters again | business §6 gap 6 |
| §3.6 A responsible person | The field does not exist | — |
| §3.7 Time-log access | **Already enforced** (D9, D10) | — |

Two things this model does *not* treat as gaps. Visibility is not bounded by
membership dates, and it does not need to be while §3.3 holds (P4). Projects are
company-wide for managers, which is the target rather than a defect.


## 6. Open decisions

Visible, deliberately unanswered, and none of them block the roadmap in §7.

- **P1 — Multi-team membership.** For now one person belongs to one team.
  Allowing several raises: do both managers see them, and who may edit their
  time? *Deferred by decision.*
- **P2 — Delegating moves to managers.** Moving a person between teams is an
  Owner action. Whether a manager may ever do it, or request it, is open.
  *Deferred by decision.*
- **P3 — Must the responsible person be a project member?** Recommend no.
- **P4 — Should time visibility be bounded by membership dates?** Recommend no
  while §3.3 holds; revisit if transfers become common.
- **P5 — Should an employee see their own team and teammates?** Today they see
  neither.
- **P6 — What happens to an invitation whose target team is archived before it
  is accepted?** *Answered by Scope D:* the user is created, the membership is
  skipped, and the Owner places them. A signup must not fail over an
  administrative action taken after the invitation was sent.
- **P7 — What happens to a team when its only manager leaves?** Still open. Scope
  D settled the neighbouring case only: an invitation sent by a manager who has
  since stopped leading the team still creates the membership.
- **P8 — Should project visibility ever narrow?** Not at this company size, and
  note the distinction §3.4 now rests on: the **project** is visible to every
  owner and manager, its **roster** is not.

Open questions about absences, planning, export and notifications stay in
[`business_architecture_docs.md`](./business_architecture_docs.md) §10.

---

## 7. Implementation roadmap

Four scopes, in dependency order. Each is meant to become a
`current-scope.md` in turn, and each is independently shippable. **C and D are
delivered; E is next and has not been started; F follows it.**

These sit **between Phase 1 and Phase 2** of the product roadmap in
[`business_architecture_docs.md`](./business_architecture_docs.md) §7. They are a
different axis — that roadmap sequences product capability, this one sequences
permission correctness — and Scope C was the reason not to start Phase 2 first.

### Scope C — Close the escalation — **delivered**

Backend and tests only; no migration, no UI.

- Pass the caller into the team write paths.
- Team create, rename, archive and any `roleInTeam` change become OWNER-only.
- **Adding** a member became OWNER-only too, until Scope D gave managers the
  safe route. "May add" is only safe once it means "may add someone new", and
  that needed the invitation to carry a team.
- **Removing** a member is scoped to teams the manager leads. Removal narrows
  their own reach, so it grants nothing and is safe to delegate now.
- `removeMember` closes `leftAt` instead of deleting.
- Invitation role restricted by the caller's role.

Closed the first two gaps in business §6 and the hard delete. **This was the
security fix and was deployed before anything else in this list.** It left
managers unable to add anyone to their team, which Scope D then closed — the two
are best read together.

### Scope D — A manager hires into their own team — **delivered**

- `Invitation` gains `teamId` and `invitedById`. *(migration)*
- A manager may invite an EMPLOYEE into a team they lead; accepting the
  invitation creates the membership, always as a `MEMBER`.
- Invite UI for managers.

Closes business §6 gap 3. Depends on C.

### Scope E — Project assignment and disclosure — **in progress**

- ~~Enforce assignment scope in `syncProjectUsers`, and narrow
  `GET /users/assignable` to the caller's people plus themselves — the two must
  land together, and the save becomes a diff bounded by that scope.~~
  **Delivered.** `TeamVisibilityService` now owns the whole owner/manager/employee
  decision, so time logs, projects and the user lists share one copy of it.
- ~~Scope the project's member list to the caller, and narrow the member DTO. One
  shape for every role; only the rows differ.~~ **Delivered.** `ProjectResponse`
  also carries the project's true `membersCount`, so a scoped list never makes a
  staffed project look empty.
- Allow managers and owners to be project members; drop the client-side
  stripping.
- Separate "may be newly assigned" from "may remain assigned", so archiving
  neither errors nor removes.

Closes gaps 4, 5 and 6 in
[`business_architecture_docs.md`](./business_architecture_docs.md) §6 — the last
three still open. Depends on C. **Its business rules were settled on 21
September 2026** and are recorded in §0 of
[`current-scope.md`](./current-scope.md), which is the implementation plan.

### Scope F — Project responsibility

- `Project.responsibleUserId`, nullable. *(migration)*
- Shown on the project card and form.

Closes nothing; adds §3.6. Depends on E.

### Not in any of these

Absences (Phase 2), correct expected hours (Phase 3), the planning interface
(Phase 4), reporting and export (Phase 5), and the `Client` entity (D8).

---

## 8. What this document is not

| For | Read |
| :--- | :--- |
| How the product behaves **today** | [`business_architecture_docs.md`](./business_architecture_docs.md) §1–§6 |
| What is being built **right now** | [`current-scope.md`](./current-scope.md) |
| System shape and where to start | [`architecture.md`](./architecture.md) |
| Modules, routes, data model | [`backend-context.md`](../apps/backend/docs/backend-context.md) |
| Defects and debt no scope owns | [`known-issues.md`](./known-issues.md) |

When a scope in §7 ships, move its rules into the business reference as current
behaviour and strike them from here.

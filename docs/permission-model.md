# WorkTrack — Target permission model

**Status: future state.** This document describes how responsibility and access
*should* work, not how the code behaves today. Nothing here is implemented
unless [`business_architecture_docs.md`](./business_architecture_docs.md) §4–§6
says so — those sections remain the record of current behaviour.

It exists because the permission rules outgrew a decision entry. They span
company membership, invitations, teams, projects and time data at once, and
writing them as another `D`-numbered decision inside the current-state document
would have mixed what is true with what is intended.

Scope of this document: **who may do what, and why.** Everything else about the
product — what a time entry is, billability, absences, reporting — stays in the
business reference.

---

## 1. What is wrong with the model today

WorkTrack currently has one permission where the business has four.

`User.role` decides whether a route is reachable, and
`TeamMembership.roleInTeam = MANAGER` decides which people's data comes back.
That is the whole system. Because `roleInTeam` is the single source of
people-visibility, **any write path that can set it is a privilege-granting
operation** — and today those paths are guarded only by "you are a manager
somewhere in this company".

The business actually distinguishes four things:

| Concept | Question it answers | Who owns it |
| :--- | :--- | :--- |
| Company membership | Who exists at all? | Owner, with managers able to hire |
| Organisational structure | Which teams exist, who leads them? | Owner |
| Operational membership | Who is in a team now? | Manager, within their team |
| Work assignment | Who is on which project? | Manager, within their people |

Collapsing these into one role check is why a manager can widen their own
visibility, and why an invitation cannot place anybody anywhere.

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

### 3.1 Company membership and invitations

The Owner may invite anyone in any role. A **manager may invite an EMPLOYEE, and
only into a team they lead** — the invitation carries the team, and accepting it
places the person in that team.

Managers may not invite managers; appointing a manager is the Owner's act of
delegation and cannot be self-propagating.

### 3.2 Team creation and manager assignment

Owner only. Creating a team, renaming it, archiving it, and setting anyone's
`roleInTeam` are all Owner actions. A manager cannot create the structure they
operate in.

### 3.3 Team membership

A manager may **add a newly invited person** to a team they lead, and may
**remove** someone from it. Removal closes `leftAt`; it never deletes the row,
because the history is what makes past time data explicable.

A manager may **not** add an existing company user to their team. That is the
move that would hand them another manager's person — and with it that person's
entire time history. Moving someone between teams is an Owner action.

**Why this is enough.** Because a manager only ever gains people who are new to
the company, there is no prior history for them to acquire retroactively. That
removes the need to bound visibility by membership dates, which would otherwise
have to be threaded through every query. See P4.

For now **a person belongs to exactly one team.** Multi-team membership is P1.

### 3.4 People visibility

Two levels, because one is not enough once projects cross teams:

| Level | Fields | Granted by |
| :--- | :--- | :--- |
| **Identity** | name, position, avatar | managing them, **or** sharing a project you can see |
| **Profile and data** | email, capacity, credential flags, time logs, planning | managing them, or being the Owner |

Without the identity level, a manager cannot read the member list of a
cross-team project they are legitimately working on. With it, they still cannot
open that person's profile or touch their time.

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
also how it works in practice.

Managers and owners may be project members like anyone else. Today they cannot
be, which is why a manager has no projects to log against at all.

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
| Marta opens *Retail Redesign* | Allowed — projects are company-wide. She sees Petro's **name**, because he is on her project, but cannot open his profile or see his time |
| Marta staffs *Retail Redesign* | She may add Dmytro, Iryna and Sofia. She may not add Petro — Mykola or Olena adds him |
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

| Rule | Today | Detail |
| :--- | :--- | :--- |
| §3.1 A manager invites into their own team | Not possible — an invitation carries no team. A manager can also invite another manager | business §6 gaps 2, 3 |
| §3.2 The Owner owns structure | Any manager can create, rename and archive teams and set `roleInTeam` | business §6 gap 1 |
| §3.3 A manager adds only people who are new | A manager can add any existing user — this is what turns gap 1 into an escalation | business §6 gap 1 |
| §3.3 Removal closes `leftAt` | `removeMember` hard-deletes the row | backend-context, Teams |
| §3.4 Two levels of visibility | One level. Project detail returns every member's name and email to any manager | business §6 gap 5 |
| §3.5 Projects stay company-wide | **Already true** | — |
| §3.5 Assign only people you can see | No server-side check, and `/users/assignable` is company-wide | business §6 gap 4 |
| §3.5 Managers may be project members | Stripped twice on the client | business §6 gap 6 |
| §3.6 A responsible person | The field does not exist | — |
| §3.7 Time-log access | **Already enforced** (D9, D10) — but only as strong as gap 1 | — |

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
  is accepted?**
- **P7 — What happens to a team when its only manager leaves?**
- **P8 — Should project visibility ever narrow?** Not at this company size.

Open questions about absences, planning, export and notifications stay in
[`business_architecture_docs.md`](./business_architecture_docs.md) §10.

---

## 7. Implementation roadmap

Four scopes, in dependency order. Each is meant to become a
`current-scope.md` in turn, and each is independently shippable.

These sit **between Phase 1 and Phase 2** of the product roadmap in
[`business_architecture_docs.md`](./business_architecture_docs.md) §7. They are a
different axis — that roadmap sequences product capability, this one sequences
permission correctness — and Scope C is the reason not to start Phase 2 first.

### Scope C — Close the escalation *(next, after B1–B10)*

Backend and tests only; no migration, no UI.

- Pass the caller into the team write paths.
- Team create, rename, archive and any `roleInTeam` change become OWNER-only.
- Membership add and remove scoped to teams the manager leads.
- `removeMember` closes `leftAt` instead of deleting.
- Invitation role restricted by the caller's role.

Closes F1, F2, F3, F8. **This is the security fix and should be deployed before
anything else in this list.**

### Scope D — A manager hires into their own team

- `Invitation` gains `teamId` and `invitedById`. *(migration)*
- A manager may invite an EMPLOYEE into a team they lead; accepting the
  invitation creates the membership.
- Invite UI for managers.

Closes F4. Depends on C.

### Scope E — Project assignment and disclosure

- Enforce assignment scope in `syncProjectUsers`, and narrow
  `GET /users/assignable` to the caller's people — the two must land together.
- Identity-level serializer for project members.
- Allow managers and owners to be project members; drop the client-side
  stripping.
- Stop dropping archived users from project membership.

Closes F5, F6, F7, F9. Depends on C.

### Scope F — Project responsibility

- `Project.responsibleUserId`, nullable. *(migration)*
- Shown on the project card and form.

Closes nothing; adds §3.6. Depends on E.

### Not in any of these

Absences (Phase 2), correct expected hours (Phase 3), the planning interface
(Phase 4), reporting and export (Phase 5), the `Client` entity (D8), and the
`planned-vs-actual` manager gap, which belongs with Phase 5.

---

## 8. What this document is not

| For | Read |
| :--- | :--- |
| How the product behaves **today** | [`business_architecture_docs.md`](./business_architecture_docs.md) §1–§6 |
| What is being built **right now** | [`current-scope.md`](./current-scope.md) |
| System shape and where to start | [`architecture.md`](./architecture.md) |
| Modules, routes, data model | [`backend-context.md`](../apps/backend/docs/backend-context.md) |

When a scope in §7 ships, move its rules into the business reference as current
behaviour and strike them from here.

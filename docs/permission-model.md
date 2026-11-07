# WorkTrack — Permission model

**Who may do what, and why.** Every rule here is enforced in the services
today. The role matrix and the current behaviour are in
[`business_architecture_docs.md`](./business_architecture_docs.md) §4–§5;
this document keeps the reasoning behind them and the permission questions
still open (§5). Everything else about the product stays in the business
reference.

---

## 1. The problem this model solves

`User.role` decides whether a route is reachable, and
`TeamMembership.roleInTeam = MANAGER` decides whose data comes back. Because
`roleInTeam` is the single source of people-visibility, **any write path that
can set it is a privilege-granting operation**. The business distinguishes four
things that one role check would collapse:

| Concept | Question it answers | Who owns it |
| :--- | :--- | :--- |
| Company membership | Who exists at all? | Owner, with managers able to hire |
| Organisational structure | Which teams exist, who leads them? | Owner |
| Operational membership | Who is in a team now? | Manager, within their team |
| Work assignment | Who is on which project? | Manager, within their people |

---

## 2. Principles

1. **The Owner defines structure; managers operate within it.** The Owner
   creates teams and appoints their managers. Managers run the team day to day.
2. **The Owner must not be a bottleneck.** A manager hires into their own team
   without waiting for the Owner.
3. **A manager may bring a person *in*, but may not take a person who already
   belongs somewhere.** This is the rule that makes delegation safe (§3.3).
4. **Teams and projects are independent axes.** A project never belongs to a
   team. Project membership, project access and team membership are separate
   concepts with separate permissions.
5. **Responsibility runs through teams, not projects.** A project is never
   owned by one person. Each manager answers for their own team's people and
   work, and the Owner is where a question that crosses teams goes.
6. **Access is enforced in services.** A hidden button is not a permission.

---

## 3. The model

### 3.1 Company membership

Appointing a manager is the Owner's act of delegation and cannot propagate
itself: an owner invites managers and employees, a manager only employees into
a team they lead, and an employee invitation always names a team (business §4
"Access"). A company has exactly one Owner; nobody can be made one, and the
Owner can't be deactivated. Handing ownership over is an open product decision
(business §10 Q17). A notification belongs to its recipient alone.

### 3.2 Team structure

Creating, renaming or archiving a team and choosing its manager are the
Owner's: a manager cannot create the structure they operate in. `roleInTeam`
changes only through Change manager on the team's panel.

**Only a Manager leads a team.** A team's manager must have the company role
MANAGER; the Owner, who already acts for everyone, cannot be one. Change
manager makes an Employee of the team a Manager in the same change, so a failed
step never leaves a Manager who leads nothing. A Manager who leads a team can't
be changed to another role until they no longer lead it, so memberships never
change as a side effect of a role change.

**Only an empty team is archived.** No open membership and no pending
invitation, or the API answers 409; archiving then changes only the status,
and restoring is its exact undo. The Owner empties the team on its panel, one
confirmed change at a time, so every change of reach is a separate, visible
decision and a restore never hands reach back by itself.

### 3.3 Team membership and reach

A manager gains people by inviting them into a team they lead, and may remove
a member from it from today; the Owner adds and moves everyone else, and alone
removes a team's manager. **A manager may not add an existing company user to
their team**: that would let them take someone who belongs elsewhere
(principle 3). Moving someone between teams is the Owner's (P2).

**Only the Owner dates a team change back.** A move, an addition or a removal
can start on an earlier day in an open month, which hands those past days to
another team, or to none. That changes what other managers reach and takes
days from the team's history, so it is the Owner's; a manager's removal always
takes effect today.

**A team keeps its history.** A manager reaches a person's records only on the
days that person was in a team the manager leads now, for reading and, in an
open month, for writing. A membership covers the days from its start up to the
day before it ends, so the day of a move belongs to the new team. It is the
leadership held now that counts: a new manager of a team reaches its whole
history, and one who stops leading it reaches none of it. Days a person spent
in no team are the Owner's alone. A record that spans days (an absence) is
read on any day reached and changed only by someone who reaches all of them.
Lists about now (People, pickers, project rosters, invitations, the Teams page)
read current membership.

**A person is in one team at a time, and a team has at most one manager**, both
held by the database. Leading a team is that team's membership, so a manager's
own hours count there; a Manager who leads no team may be a plain member of
another team, whose manager then reaches them. The Owner chooses a team's
manager with Change manager, from its members or from Managers in no team,
never from another team, so appointing one moves nobody and changes no other
team; someone who leads their team is moved only once it has another manager,
and a manager invitation holds a team's lead until it is accepted or revoked. A
team may have no manager, and the Owner covers it. Adding a member of another
team is a move, confirmed by the Owner. Being a member grants nothing: reach
comes only from leading. **The Owner is in no team**: membership would give the Owner
nothing and would give that team's managers reach over the Owner's records.

**Membership and reach are separate.** Membership says where a person's hours
count and who leads a team; reach says whose records someone may read or
change. Today reach comes only from leading, and a later grant of access would
add reach without changing anyone's membership (P4).

### 3.4 People visibility

**One level, one rule.** A manager sees the people in the teams they lead, on
the days they were in them, plus themselves; an Owner sees everyone. Nobody
else's name, profile, time or plan is readable, on any screen, by any route.
Sharing a project grants nothing: a separate "identity" tier for people on a
shared project would hand back the names `GET /users` refuses (D10), and every
new endpoint would have to choose a tier.

What is given up: a manager can't tell who else is on a cross-team project, and
asks the Owner. That is the design, not a stopgap: a manager answers for their
own team's people, and the Owner is the escalation path (§2).

**A count is not a roster, and stays whole.** Every role sees a project's true
member count, and a list showing fewer people says how many are hidden. A
scoped count would tell a manager a staffed project is empty. A per-team
breakdown ("4 from Design") was declined: it would let managers reach each
other's teams directly and route around the Owner.

**One name on a record.** Who added or last changed a time entry or an absence
is named to everyone who can read the record, even someone the reader can't
otherwise see: it names the one writer, not a roster, and knowing who changed
your record is the point.

### 3.5 Projects

**Projects stay company-wide for owners and managers; only people narrow.**
Scoping projects by team is wrong by construction, since projects span teams;
scoping them by membership would make a project vanish from the manager whose
team does the work once their last person rotates off.

**Project membership** is who may log time on it. A manager adds only people
they can see, so a cross-team project is staffed by each manager contributing
their own people; the Owner adds anyone. Managers and owners are ordinary
members.

- **A manager changes only what they were shown.** A save adds and removes
  inside their scope and leaves everyone else untouched; a single add or remove
  outside it is refused.
- **A manager may always add themselves**, even one who leads no team, so they
  have a project to log against.
- **Active status gates joining, not staying.** Only an active user is newly
  assigned to a project or a team; deactivating someone removes no membership,
  so reactivating restores nothing (business §8 rule 6).

**Archiving or restoring a project is the Owner's**, since archiving removes
everyone's plans on it from today on, people outside any one manager's reach
included. Managers create and edit projects and choose their activities from
the Owner's catalogue. **Employees** see the projects they are on and, for
each, its name, status and client name, and nothing about any other project.

### 3.6 A project has no owner

Each team's manager answers for that team's people and their work on a
project; a question outside their team goes to the Owner. A responsible person
per project was considered and dropped in September 2026, before any code: one
name would flatten a per-team relationship and repeat by hand what the team
memberships already hold. Per-project rights would be a new decision.

### 3.7 Time, absences, plans and reports

Time-log access is D9 and D10: the Owner for anyone, a manager for the people
in teams they lead on their days in them, everyone for themselves. This model
changes what it takes to *become* someone's manager, which is what makes that
rule trustworthy.

- **A leaver's last month can be corrected** in open months by the same people
  as an active person's, up to and including their last working day; nothing
  can be dated after it, or inside a spell between a last working day and the
  first day back. Deactivating deletes what was recorded after the last
  working day, which the Owner or the person's manager could already delete
  one record at a time. No new or changed plan for a deactivated person;
  deleting plans is allowed.
- **Planning follows the same people**, except that an employee plans for
  nobody, not even themselves. Recording an absence deletes the absence owner's
  plans on its days, which opens no planning route to employees. A manager's
  project save only removes people they were shown, so they can never clear
  plans for someone outside their teams.
- **Reports follow the same people.** The hours and people reports answer
  every role through the same visibility, an employee getting their own figures
  alone; the export and the timeline stay with owners and managers.

### 3.8 Delegation summary

The Owner keeps structure (teams, the activity catalogue, archiving projects),
role grants (Manager or Employee; the Owner role is never granted), moving
people, and everything a manager can do. The manager gets hiring into their
team, running it, creating projects and staffing them with their people.
Neither can quietly become the other.

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
| Mary removes Irene from Alpha | Allowed, from today. `leftAt` is closed; the row and the history stay, and Mary still reaches Irene's days before today. Only Olivia could date the removal back (§3.3) |
| Mary opens *Retail Redesign* | Allowed — projects are company-wide. She sees Daniel, Irene and Sophie on it, and a count telling her others are there. She does **not** see Peter, not even his name |
| Mary staffs *Retail Redesign* | She may add Daniel, Irene, Sophie and **herself**. She may not add Peter — Mark or Olivia adds him |
| Mary saves *Retail Redesign* without Peter in her list | Peter stays. Her save only touches the people she was shown |
| Olivia deactivates Daniel | She picks his last working day; anything recorded after it is deleted, after the dialog lists it. He stays on *Retail Redesign* and in Team Alpha. He cannot log time, because he cannot sign in. Mary and Olivia can still correct his time and absences for the open month, up to his last working day (§3.7). Reactivating him from a first day back restores none of what was deleted |
| Mary wants to know who else is on *Retail Redesign* | She sees her own people and a true count. For anything on Peter's side of the work she asks Olivia — nobody is responsible for the project itself (§3.6) |
| Mary logs her own time on *Retail Redesign* | Allowed once she is a project member — managers are ordinary members |
| Mark opens *Retail Redesign* | Same rights as Mary. Projects are not owned by a team |
| Olivia replaces Mary with Sophie | Change manager on Alpha: Sophie, an Employee in Alpha, becomes a Manager and leads it from today; Mary stays as a member or leaves. Sophie reaches Alpha's whole history, Mary none of it |
| Olivia does any of the above | Allowed, always |

---

## 5. Open decisions

Visible and deliberately unanswered; each waits for a real need.

- **P2 — Delegating moves to managers.** Moving a person between teams is an
  Owner action. Whether a manager may ever do it, or request it, is open.
- **P7 — What happens to a team when its only manager leaves?** Open. A team
  may be without a manager, which the Owner covers, and nothing happens
  automatically. The neighbouring case is settled: an invitation sent by a
  manager who has since stopped leading the team still creates the membership.
- **P8 — Should project visibility ever narrow?** Not at this company size. The
  **project** is visible to every owner and manager; its **roster** is not.

Answered:

- **P1 — Multi-team membership:** no (27 October 2026), and since 5 November
  2026 managers included: one team per person, one manager per team (§3.3).
- **P4 — Does reach follow the dates a person was in a team?** Yes (3 November
  2026, PR #63; §3.3). Reach is one set of dated rows built in
  `TeamVisibilityService`, so a later grant (business §7, "Configurable
  permissions") would be another source of such rows, not a new branch at each
  check.
- **P5 — Does an employee see their team and teammates?** No (24 October
  2026): that is an HR product's directory (business §1). Revisit only with the
  HR product.
- **P9 — What does an archived team mean for access?** Nothing: only an empty
  team is archived (27 October 2026; §3.2).

Open questions about the rest of the product are in
[`business_architecture_docs.md`](./business_architecture_docs.md) §10.

---

## 6. When a rule changes

Record the new rule in §3 here and in the business reference's §4–§5 in the
same change.

# WorkTrack — What next

A proposal from the person who built WorkTrack so far, for whoever takes it
on. Nothing here is decided: it says what looks most worth doing first, and
which choices are waiting for an owner.

## 1. Access to a team for a deputy

**The gap.** A team has one manager, and only the manager and the owner reach
its people's time, absences, plans and reports
([`permission-model.md`](./permission-model.md) §3.3). When a manager is away,
nobody but the owner can correct a week, record an absence or plan the team.

**The proposal.** Let the owner, and a manager for a team they lead, give one
person access to one team: the same reach its manager has, for as long as the
grant stands.

- A grant adds reach without changing membership: the deputy stays in their
  own team, and the team keeps its one manager. The permission model already
  keeps the two apart for this reason.
- Reach stays defined by teams. A grant names a team, never single people, so
  the rule "you see a team's people on the days they were in it" holds for a
  deputy as it does for a manager.
- Team structure stays the owner's: a deputy doesn't invite, move or remove
  people, and can't pass the grant on.
- On screen it is a plain switch on the team's panel, with a name and an
  optional end date, rather than a permission grid or custom roles.

**Later, and separately:** granting some of the owner's administrative tasks
(the activity catalogue, periods, archiving projects). Each owner-only task
is already enforced on its own routes, so each can become one grant.

## 2. Before real use

WorkTrack runs on a development stand with test data. The section "Before a
production launch" in [`known-issues.md`](./known-issues.md) lists what real
users need first. The short version: paid always-on hosting and a domain,
migrations as a release step, a health check, error tracking, and a backup
that has been restored once.

## 3. Decisions waiting for an owner

- **Handing ownership over.** A company has exactly one owner and nothing
  transfers it. The first real company will need this the day its owner
  leaves.
- **Deleting an account or a company, and exporting a person's data.**
  Nothing does either; it is needed before the product holds real people's
  data.
- **Whether sign-up stays open.** Anyone can start a company today. For one
  company's internal tool, sign-up can close once that company exists.
- **Hosting and domain.** Where production runs, under whose accounts, and
  the Google sign-in and email sending domains that follow from it.

## 4. Smaller things people will ask for

From [`known-issues.md`](./known-issues.md), the ones most likely to come up
in daily use: a copy of a day or a week in Log my time, Team time and
Planning on a phone, a working pattern for part-time staff, and filters in
the Manage lists.

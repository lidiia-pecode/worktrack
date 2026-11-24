import { DataSource } from 'typeorm';
import { Absence } from 'src/absences/entities/absence.entity';
import { AbsenceType } from 'src/absences/enums/absence-type.enum';
import { Activity } from 'src/activities/entities/activity.entity';
import { PlanningEntry } from 'src/planning/entities/planning-entry.entity';
import { Project } from 'src/projects/entities/project.entity';
import { TimeLog } from 'src/time-logs/entities/time-log.entity';
import { eachDate, isWorkingDay } from 'src/capacity/working-days.util';

import {
  HISTORY_START,
  OWNER_EMAIL,
  PLANS_UNTIL,
  PROJECTS,
  PUBLIC_HOLIDAYS,
  REPORT_HISTORY,
  SeedHistory,
  SeedPlan,
  SeedWork,
  USERS,
  YESTERDAY,
} from './seed-config';
import { buildLookups } from './seed-lookups';

const INSERT_CHUNK = 1000;
const FRIDAY = 5;

const latest = (...dates: (string | undefined)[]) =>
  dates
    .filter((date): date is string => Boolean(date))
    .sort()
    .at(-1)!;
const earliest = (...dates: (string | undefined)[]) =>
  dates.filter((date): date is string => Boolean(date)).sort()[0];

const isOn = (item: SeedWork | SeedPlan, date: string) =>
  (!item.from || date >= item.from) && (!item.to || date <= item.to);

const isFriday = (date: string) =>
  new Date(`${date}T00:00:00Z`).getUTCDay() === FRIDAY;

/** Whether a person logs on a working day, given the profile's exceptions. */
const logsOn = (person: SeedHistory, date: string) =>
  !person.missedDays?.includes(date) &&
  !(
    person.missesFridaysFrom &&
    date >= person.missesFridaysFrom &&
    isFriday(date)
  );

function assertMember(email: string, project: string) {
  const members = PROJECTS.find((p) => p.name === project)?.members ?? [];
  if (!members.includes(email)) {
    throw new Error(`"${email}" is not a member of "${project}"`);
  }
}

async function insertInChunks<T extends object>(
  dataSource: DataSource,
  entity: new () => T,
  rows: Partial<T>[],
) {
  const repo = dataSource.getRepository(entity);
  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    await repo.insert(rows.slice(i, i + INSERT_CHUNK) as never);
  }
}

/**
 * Time up to yesterday, plans up to PLANS_UNTIL and absences since
 * HISTORY_START, from REPORT_HISTORY. Runs once: a company that already holds
 * time is left as it is.
 */
export async function seedReportHistory(
  dataSource: DataSource,
  companyId: string,
) {
  const hasHistory = await dataSource
    .getRepository(TimeLog)
    .existsBy({ companyId });

  if (hasHistory) {
    console.log('✅ Report history already seeded');
    return;
  }

  const lookup = await buildLookups(dataSource, companyId);
  const projects = await dataSource
    .getRepository(Project)
    .findBy({ companyId });
  const activities = await dataSource
    .getRepository(Activity)
    .findBy({ companyId });
  const createdById = lookup.userId(OWNER_EMAIL);

  const isBillable = (project: string, activity: string) =>
    Boolean(projects.find((p) => p.name === project)?.clientName) &&
    (activities.find((a) => a.name === activity)?.defaultBillable ?? true);

  const timeLogs: Partial<TimeLog>[] = [];
  const plans: Partial<PlanningEntry>[] = [];
  const absences: Partial<Absence>[] = [];

  const logTime = (email: string, date: string, item: SeedWork) => {
    assertMember(email, item.project);
    timeLogs.push({
      companyId,
      userId: lookup.userId(email),
      projectActivityId: lookup.projectActivityId(item.project, item.activity),
      date,
      minutes: item.minutes,
      isBillable: isBillable(item.project, item.activity),
      note: `${item.activity} on ${item.project}`,
    });
  };

  for (const person of REPORT_HISTORY) {
    const user = USERS.find((u) => u.email === person.email)!;
    const userId = lookup.userId(person.email);

    const start = latest(HISTORY_START, user.joinedOn);
    const lastLogged = earliest(YESTERDAY, user.lastWorkingDay);
    const lastPlanned = earliest(PLANS_UNTIL, user.lastWorkingDay);

    const personAbsences = [
      ...(person.absences ?? []),
      ...PUBLIC_HOLIDAYS.filter(
        (date) => date >= start && date <= lastPlanned,
      ).map((date) => ({
        type: AbsenceType.PUBLIC_HOLIDAY,
        startDate: date,
        endDate: date,
      })),
    ];
    const daysOff = new Set<string>();
    for (const absence of personAbsences) {
      for (const date of eachDate(absence.startDate, absence.endDate)) {
        daysOff.add(date);
      }
      absences.push({ companyId, userId, ...absence });
    }
    for (const { type, date, minutes } of person.partAbsences ?? []) {
      absences.push({
        companyId,
        userId,
        type,
        startDate: date,
        endDate: date,
        minutes,
      });
    }

    for (const date of eachDate(start, lastPlanned)) {
      if (!isWorkingDay(date) || daysOff.has(date)) continue;

      for (const item of person.plan.filter((p) => isOn(p, date))) {
        assertMember(person.email, item.project);
        plans.push({
          companyId,
          userId,
          projectId: lookup.projectId(item.project),
          createdById,
          date,
          plannedMinutes: item.minutes,
        });
      }

      if (date > lastLogged || !logsOn(person, date)) continue;

      const partAbsence = person.partAbsences?.find((a) => a.date === date);
      const work =
        partAbsence?.work ?? person.work.filter((w) => isOn(w, date));
      for (const item of work) {
        logTime(person.email, date, item);
      }
    }

    for (const item of person.weekendWork ?? []) {
      if (item.date <= lastLogged) logTime(person.email, item.date, item);
    }
  }

  await insertInChunks(dataSource, TimeLog, timeLogs);
  await insertInChunks(dataSource, PlanningEntry, plans);
  await insertInChunks(dataSource, Absence, absences);

  console.log(
    `✅ Report history seeded (${timeLogs.length} time logs, ${plans.length} plans, ${absences.length} absences)`,
  );
}

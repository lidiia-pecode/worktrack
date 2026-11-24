import { Column, Workbook } from 'exceljs';

import type { PeopleReport } from './people/people-report.service';
import type { HoursExportRow } from './reporting.service';

export const XLSX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const MINUTES_PER_HOUR = 60;
const ENTRIES_SHEET = 'Time Entries';
const SUMMARY_SHEET = 'Employee Summary';

const HOURS_FORMAT = { numFmt: '0.00' };

type SheetColumn = Partial<Column>;

const ENTRY_COLUMNS: SheetColumn[] = [
  { header: 'Date', key: 'date', width: 12, style: { numFmt: 'yyyy-mm-dd' } },
  { header: 'Person', key: 'person', width: 24 },
  { header: 'Email', key: 'email', width: 28 },
  { header: 'Client', key: 'client', width: 24 },
  { header: 'Project', key: 'project', width: 24 },
  { header: 'Activity', key: 'activity', width: 20 },
  { header: 'Category', key: 'category', width: 16 },
  { header: 'Billing', key: 'billing', width: 14 },
  { header: 'Hours', key: 'hours', width: 8, style: HOURS_FORMAT },
  { header: 'Period', key: 'period', width: 9 },
];

const SUMMARY_COLUMNS: SheetColumn[] = [
  { header: 'Person', key: 'person', width: 24 },
  { header: 'Email', key: 'email', width: 28 },
  { header: 'Team', key: 'team', width: 24 },
  { header: 'Expected', key: 'expected', width: 10, style: HOURS_FORMAT },
  { header: 'Logged', key: 'logged', width: 10, style: HOURS_FORMAT },
  { header: 'Difference', key: 'difference', width: 11, style: HOURS_FORMAT },
  { header: 'Billable', key: 'billable', width: 10, style: HOURS_FORMAT },
  { header: 'Vacation', key: 'vacation', width: 10 },
  { header: 'Sick leave', key: 'sickLeave', width: 10 },
  { header: 'Public holiday', key: 'publicHoliday', width: 14 },
  {
    header: 'Part-day absences',
    key: 'partDayAbsences',
    width: 17,
    style: HOURS_FORMAT,
  },
  { header: 'Period', key: 'period', width: 9 },
];

const toHours = (minutes: number) => minutes / MINUTES_PER_HOUR;

const periodLabel = (isClosed: boolean) => (isClosed ? 'Closed' : 'Open');

/** An Excel date is a day, not a moment, so it is built at UTC midnight. */
const toExcelDate = (date: string): Date => new Date(`${date}T00:00:00Z`);

/** A sheet with a bold, frozen header row that filters. */
const addSheet = (
  workbook: Workbook,
  name: string,
  columns: SheetColumn[],
  rows: Record<string, unknown>[],
) => {
  const sheet = workbook.addWorksheet(name, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  sheet.columns = columns;
  sheet.getRow(1).font = { bold: true };
  sheet.autoFilter = { from: 'A1', to: { row: 1, column: columns.length } };
  sheet.addRows(rows);
};

/**
 * The hours export: each person's time entries, and a summary of each
 * person's hours and absences over the same finished days, as Reports' People
 * table shows them. Names are typed by users, but every one is written as a
 * text cell, so a name starting with "=" is shown as it is and never run as a
 * formula.
 */
export const buildHoursExportWorkbook = async (
  rows: HoursExportRow[],
  summary: PeopleReport,
): Promise<Buffer> => {
  const workbook = new Workbook();

  addSheet(
    workbook,
    ENTRIES_SHEET,
    ENTRY_COLUMNS,
    rows.map((row) => ({
      date: toExcelDate(row.date),
      person: row.person,
      email: row.email,
      client: row.client,
      project: row.project,
      activity: row.activity,
      category: row.category,
      billing: row.billing,
      hours: toHours(row.minutes),
      period: periodLabel(row.isPeriodClosed),
    })),
  );

  const summaryPeriod = periodLabel(!summary.isProvisional);
  addSheet(
    workbook,
    SUMMARY_SHEET,
    SUMMARY_COLUMNS,
    summary.rows.map((person) => ({
      person: person.name,
      email: person.email,
      team: person.teams.map((team) => team.name).join(', ') || null,
      expected: toHours(person.expectedMinutes),
      logged: toHours(person.loggedMinutes),
      // Nothing expected leaves nothing to measure against, as in Reports.
      difference:
        person.expectedMinutes > 0
          ? toHours(person.loggedMinutes - person.expectedMinutes)
          : null,
      billable: toHours(person.billableMinutes),
      vacation: person.vacationDays,
      sickLeave: person.sickLeaveDays,
      publicHoliday: person.publicHolidayDays,
      partDayAbsences: toHours(person.partDayAbsenceMinutes),
      period: summaryPeriod,
    })),
  );

  return Buffer.from(await workbook.xlsx.writeBuffer());
};

/** "Mobile Squad" as "mobile-squad"; a name with no Latin letters or digits gives none. */
const fileNamePart = (name: string) =>
  name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * `worktrack-hours-2026-10-01-2026-10-31.xlsx`, the first day and the last day
 * counted, with the team between when the export is for one:
 * `worktrack-hours-mobile-squad-…`. Before any day is counted, it ends on the
 * first day.
 */
export const hoursExportFileName = (
  dateFrom: string,
  countedTo: string,
  teamName?: string | null,
) => {
  const team = teamName ? fileNamePart(teamName) : '';
  const lastDay = countedTo > dateFrom ? countedTo : dateFrom;
  return (
    ['worktrack-hours', team, dateFrom, lastDay].filter(Boolean).join('-') +
    '.xlsx'
  );
};

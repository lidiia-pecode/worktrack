import { ValueType, Workbook, Worksheet } from 'exceljs';

import { HoursBilling } from './enums/hours-billing.enum';
import type {
  PeopleReport,
  PeopleReportRow,
} from './people/people-report.service';
import type { HoursExportRow } from './reporting.service';
import {
  buildHoursExportWorkbook,
  hoursExportFileName,
} from './hours-export.workbook';

const row: HoursExportRow = {
  date: '2026-09-15',
  person: 'Emma Clarke',
  email: 'emma.clarke@example.com',
  client: null,
  project: 'Tooling',
  activity: 'Backend',
  category: null,
  billing: HoursBilling.NON_BILLABLE,
  minutes: 450,
  isPeriodClosed: false,
};

const person = {
  name: 'Emma Clarke',
  email: 'emma.clarke@example.com',
  teams: [{ name: 'North' }, { name: 'South' }],
  expectedMinutes: 9600,
  loggedMinutes: 9900,
  billableMinutes: 6000,
  vacationDays: 3,
  sickLeaveDays: 1,
  publicHolidayDays: 0,
  partDayAbsenceMinutes: 145,
} as PeopleReportRow;

const report = (rows: PeopleReportRow[], isProvisional = false): PeopleReport =>
  ({ rows, isProvisional }) as PeopleReport;

/** Column keys are not saved in the file, so cells are read back by letter. */
const COLUMN = {
  date: 'A',
  email: 'C',
  client: 'D',
  project: 'E',
  category: 'G',
  hours: 'I',
  period: 'J',
};

const SUMMARY_COLUMN = {
  team: 'C',
  expected: 'D',
  logged: 'E',
  difference: 'F',
  billable: 'G',
  vacation: 'H',
  sickLeave: 'I',
  partDayAbsences: 'K',
  period: 'L',
};

const readWorkbook = async (
  rows: HoursExportRow[],
  summary = report([person]),
): Promise<Workbook> => {
  const file = await buildHoursExportWorkbook(rows, summary);
  const workbook = new Workbook();
  await workbook.xlsx.load(Uint8Array.from(file).buffer);
  return workbook;
};

const readSheet = async (rows: HoursExportRow[]): Promise<Worksheet> =>
  (await readWorkbook(rows)).getWorksheet('Time Entries')!;

const readSummary = async (summary: PeopleReport): Promise<Worksheet> =>
  (await readWorkbook([row], summary)).getWorksheet('Employee Summary')!;

describe('hours export workbook', () => {
  it('has the time entries, then the summary', async () => {
    const workbook = await readWorkbook([row]);

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      'Time Entries',
      'Employee Summary',
    ]);
  });

  it('has a header row and one row per export row', async () => {
    const sheet = await readSheet([row, { ...row, isPeriodClosed: true }]);

    expect(sheet.getRow(1).values).toEqual([
      undefined,
      'Date',
      'Person',
      'Email',
      'Client',
      'Project',
      'Activity',
      'Category',
      'Billing',
      'Hours',
      'Period',
    ]);
    expect(sheet.rowCount).toBe(3);
  });

  it('writes the date as a date and hours as a number', async () => {
    const sheet = await readSheet([row]);
    const cells = sheet.getRow(2);

    expect(cells.getCell(COLUMN.date).value).toEqual(
      new Date('2026-09-15T00:00:00Z'),
    );
    expect(cells.getCell(COLUMN.hours).value).toBe(7.5);
    expect(cells.getCell(COLUMN.hours).numFmt).toBe('0.00');
  });

  it('writes the email after the name, so two people with one name differ', async () => {
    const cells = (await readSheet([row])).getRow(2);

    expect(cells.getCell(COLUMN.email).value).toBe('emma.clarke@example.com');
  });

  it('leaves a missing client and category empty', async () => {
    const cells = (await readSheet([row])).getRow(2);

    expect(cells.getCell(COLUMN.client).value).toBeNull();
    expect(cells.getCell(COLUMN.category).value).toBeNull();
  });

  it('marks each row open or closed', async () => {
    const sheet = await readSheet([row, { ...row, isPeriodClosed: true }]);

    expect(sheet.getRow(2).getCell(COLUMN.period).value).toBe('Open');
    expect(sheet.getRow(3).getCell(COLUMN.period).value).toBe('Closed');
  });

  it('keeps a name that looks like a formula as text', async () => {
    const cell = (await readSheet([{ ...row, project: '=HYPERLINK("x")' }]))
      .getRow(2)
      .getCell(COLUMN.project);

    expect(cell.type).toBe(ValueType.String);
    expect(cell.value).toBe('=HYPERLINK("x")');
  });

  describe('employee summary', () => {
    it('has a header row and one row per person', async () => {
      const sheet = await readSummary(report([person, person]));

      expect(sheet.getRow(1).values).toEqual([
        undefined,
        'Person',
        'Email',
        'Team',
        'Expected',
        'Logged',
        'Difference',
        'Billable',
        'Vacation',
        'Sick leave',
        'Public holiday',
        'Part-day absences',
        'Period',
      ]);
      expect(sheet.rowCount).toBe(3);
    });

    it('writes hours as decimals, whole days off by reason and part-day hours apart', async () => {
      const cells = (await readSummary(report([person]))).getRow(2);

      expect(cells.getCell(SUMMARY_COLUMN.team).value).toBe('North, South');
      expect(cells.getCell(SUMMARY_COLUMN.expected).value).toBe(160);
      expect(cells.getCell(SUMMARY_COLUMN.logged).value).toBe(165);
      expect(cells.getCell(SUMMARY_COLUMN.difference).value).toBe(5);
      expect(cells.getCell(SUMMARY_COLUMN.billable).value).toBe(100);
      expect(cells.getCell(SUMMARY_COLUMN.vacation).value).toBe(3);
      expect(cells.getCell(SUMMARY_COLUMN.sickLeave).value).toBe(1);
      expect(cells.getCell(SUMMARY_COLUMN.partDayAbsences).value).toBeCloseTo(
        2.4167,
      );
      expect(cells.getCell(SUMMARY_COLUMN.partDayAbsences).numFmt).toBe('0.00');
    });

    it('leaves the difference empty when nothing was expected', async () => {
      const cells = (
        await readSummary(report([{ ...person, expectedMinutes: 0 }]))
      ).getRow(2);

      expect(cells.getCell(SUMMARY_COLUMN.difference).value).toBeNull();
    });

    it('reads Closed only when every month of the range is locked', async () => {
      const period = async (isProvisional: boolean) =>
        (await readSummary(report([person], isProvisional)))
          .getRow(2)
          .getCell(SUMMARY_COLUMN.period).value;

      expect(await period(false)).toBe('Closed');
      expect(await period(true)).toBe('Open');
    });
  });

  it('names the file after the days counted, and the team when it is for one', () => {
    expect(hoursExportFileName('2026-09-01', '2026-09-30')).toBe(
      'worktrack-hours-2026-09-01-2026-09-30.xlsx',
    );
    expect(
      hoursExportFileName('2026-09-01', '2026-09-30', 'Mobile Squad & QA'),
    ).toBe('worktrack-hours-mobile-squad-qa-2026-09-01-2026-09-30.xlsx');
    expect(hoursExportFileName('2026-09-01', '2026-09-30', '★ ★')).toBe(
      'worktrack-hours-2026-09-01-2026-09-30.xlsx',
    );
    // Nothing counted yet: it ends on the first day.
    expect(hoursExportFileName('2026-09-01', '2026-08-31')).toBe(
      'worktrack-hours-2026-09-01-2026-09-01.xlsx',
    );
  });
});

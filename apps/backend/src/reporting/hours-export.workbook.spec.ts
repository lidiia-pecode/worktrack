import { ValueType, Workbook, Worksheet } from 'exceljs';

import { HoursBilling } from './enums/hours-billing.enum';
import type { HoursExportRow } from './reporting.service';
import {
  buildHoursExportWorkbook,
  hoursExportFileName,
} from './hours-export.workbook';

const row: HoursExportRow = {
  date: '2026-09-15',
  person: 'Emma Clarke',
  client: null,
  project: 'Tooling',
  activity: 'Backend',
  category: null,
  billing: HoursBilling.INTERNAL,
  minutes: 450,
  isPeriodClosed: false,
};

/** Column keys are not saved in the file, so cells are read back by letter. */
const COLUMN = {
  date: 'A',
  client: 'C',
  project: 'D',
  category: 'F',
  hours: 'H',
  minutes: 'I',
  period: 'J',
};

const readSheet = async (rows: HoursExportRow[]): Promise<Worksheet> => {
  const file = await buildHoursExportWorkbook(rows);
  const workbook = new Workbook();
  await workbook.xlsx.load(Uint8Array.from(file).buffer);
  return workbook.getWorksheet('Hours')!;
};

describe('hours export workbook', () => {
  it('has a header row and one row per export row', async () => {
    const sheet = await readSheet([row, { ...row, isPeriodClosed: true }]);

    expect(sheet.getRow(1).values).toEqual([
      undefined,
      'Date',
      'Person',
      'Client',
      'Project',
      'Activity',
      'Category',
      'Billing',
      'Hours',
      'Minutes',
      'Period',
    ]);
    expect(sheet.rowCount).toBe(3);
  });

  it('writes the date as a date and hours as a number next to minutes', async () => {
    const sheet = await readSheet([row]);
    const cells = sheet.getRow(2);

    expect(cells.getCell(COLUMN.date).value).toEqual(
      new Date('2026-09-15T00:00:00Z'),
    );
    expect(cells.getCell(COLUMN.hours).value).toBe(7.5);
    expect(cells.getCell(COLUMN.hours).numFmt).toBe('0.00');
    expect(cells.getCell(COLUMN.minutes).value).toBe(450);
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

  it('names the file after the range', () => {
    expect(
      hoursExportFileName({ dateFrom: '2026-09-01', dateTo: '2026-09-30' }),
    ).toBe('worktrack-hours-2026-09-01-2026-09-30.xlsx');
  });
});

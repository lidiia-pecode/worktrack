import { Workbook } from 'exceljs';

import type { HoursExportQuery } from './dtos/hours-export-query.dto';
import type { HoursExportRow } from './reporting.service';

export const XLSX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const MINUTES_PER_HOUR = 60;
const SHEET_NAME = 'Hours';

const COLUMNS = [
  { header: 'Date', key: 'date', width: 12, style: { numFmt: 'yyyy-mm-dd' } },
  { header: 'Person', key: 'person', width: 24 },
  { header: 'Client', key: 'client', width: 24 },
  { header: 'Project', key: 'project', width: 24 },
  { header: 'Activity', key: 'activity', width: 20 },
  { header: 'Category', key: 'category', width: 16 },
  { header: 'Billing', key: 'billing', width: 14 },
  { header: 'Hours', key: 'hours', width: 8, style: { numFmt: '0.00' } },
  { header: 'Minutes', key: 'minutes', width: 9 },
  { header: 'Period', key: 'period', width: 9 },
];

/** An Excel date is a day, not a moment, so it is built at UTC midnight. */
const toExcelDate = (date: string): Date => new Date(`${date}T00:00:00Z`);

/**
 * Names are typed by users, but every one is written as a text cell, so a
 * name starting with "=" is shown as it is and never run as a formula.
 */
export const buildHoursExportWorkbook = async (
  rows: HoursExportRow[],
): Promise<Buffer> => {
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet(SHEET_NAME, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.columns = COLUMNS;
  sheet.getRow(1).font = { bold: true };
  sheet.autoFilter = { from: 'A1', to: { row: 1, column: COLUMNS.length } };

  sheet.addRows(
    rows.map((row) => ({
      date: toExcelDate(row.date),
      person: row.person,
      client: row.client,
      project: row.project,
      activity: row.activity,
      category: row.category,
      billing: row.billing,
      hours: row.minutes / MINUTES_PER_HOUR,
      minutes: row.minutes,
      period: row.isPeriodClosed ? 'Closed' : 'Open',
    })),
  );

  return Buffer.from(await workbook.xlsx.writeBuffer());
};

export const hoursExportFileName = ({ dateFrom, dateTo }: HoursExportQuery) =>
  `worktrack-hours-${dateFrom}-${dateTo}.xlsx`;

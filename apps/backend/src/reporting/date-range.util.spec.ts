import { BadRequestException } from '@nestjs/common';

import { assertDateRange } from './date-range.util';

describe('assertDateRange', () => {
  it('accepts a single day and a full leap year', () => {
    expect(() => assertDateRange('2026-03-10', '2026-03-10')).not.toThrow();
    expect(() => assertDateRange('2028-01-01', '2028-12-31')).not.toThrow();
  });

  it('counts both ends: 366 days pass, 367 are refused', () => {
    expect(() => assertDateRange('2025-01-01', '2026-01-01')).not.toThrow();
    expect(() => assertDateRange('2025-01-01', '2026-01-02')).toThrow(
      'A date range can cover at most 366 days',
    );
  });

  it('refuses a far-off end date, such as a mistyped year', () => {
    expect(() => assertDateRange('2026-01-01', '9999-12-31')).toThrow(
      BadRequestException,
    );
  });

  it('still refuses a range that runs backwards', () => {
    expect(() => assertDateRange('2026-03-10', '2026-03-09')).toThrow(
      'dateFrom cannot be after dateTo',
    );
  });
});

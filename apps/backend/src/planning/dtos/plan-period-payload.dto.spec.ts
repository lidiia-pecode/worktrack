import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import {
  PlanPeriodPayload,
  PreviewPeriodPayload,
} from './plan-period-payload.dto';

const body = (projects: unknown[]) => ({
  userId: '4f7a3c2e-8b1d-4e6f-9a0b-1c2d3e4f5a6b',
  startDate: '2026-11-02',
  endDate: '2026-11-06',
  projects,
});

const failing = async (dto: object) =>
  (await validate(dto)).map((error) => error.property);

describe('PlanPeriodPayload', () => {
  it('needs at least one project, with a whole number of minutes', async () => {
    expect(await failing(plainToInstance(PlanPeriodPayload, body([])))).toEqual(
      ['projects'],
    );

    const halfMinute = body([
      { projectId: '4f7a3c2e-8b1d-4e6f-9a0b-1c2d3e4f5a6b', minutesPerDay: 1.5 },
    ]);
    expect(
      await failing(plainToInstance(PlanPeriodPayload, halfMinute)),
    ).toEqual(['projects']);
  });

  it('previews with no project yet, checking the ones listed', async () => {
    expect(
      await failing(plainToInstance(PreviewPeriodPayload, body([]))),
    ).toEqual([]);

    const badProject = body([{ projectId: 'not-a-uuid', minutesPerDay: 60 }]);
    expect(
      await failing(plainToInstance(PreviewPeriodPayload, badProject)),
    ).toEqual(['projects']);
  });
});

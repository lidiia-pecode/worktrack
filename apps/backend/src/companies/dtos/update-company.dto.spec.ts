import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { UpdateCompanyDto } from './update-company.dto';

const isAccepted = async (timezone: unknown) => {
  const errors = await validate(
    plainToInstance(UpdateCompanyDto, { timezone }),
  );
  return errors.length === 0;
};

describe('UpdateCompanyDto timezone', () => {
  it.each([
    'UTC',
    'Europe/Kyiv',
    'Europe/Kiev',
    'America/Argentina/Buenos_Aires',
    'America/Port-au-Prince',
    'Etc/GMT+3',
    'Europe/Simferopol',
  ])('accepts %s', async (timezone) => {
    await expect(isAccepted(timezone)).resolves.toBe(true);
  });

  it.each(['Europe/Moscow', 'Europe/Kaliningrad', 'Asia/Vladivostok', 'W-SU'])(
    'refuses the Russian zone %s',
    async (timezone) => {
      await expect(isAccepted(timezone)).resolves.toBe(false);
    },
  );

  it('saves Europe/Kiev as Europe/Kyiv', () => {
    const dto = plainToInstance(UpdateCompanyDto, { timezone: 'Europe/Kiev' });

    expect(dto.timezone).toBe('Europe/Kyiv');
  });

  it.each(['Mars/Olympus_Mons', 'Europe', '+03:00', 'GMT+3:00', '', 3])(
    'refuses %p',
    async (timezone) => {
      await expect(isAccepted(timezone)).resolves.toBe(false);
    },
  );
});

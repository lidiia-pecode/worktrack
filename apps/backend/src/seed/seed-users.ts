import { DataSource } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { UserStatus } from 'src/users/enums/user-role.enum';
import { UserCapacity } from 'src/capacity/entities/user-capacity.entity';
import { hashPassword } from 'src/lib/utils/hash-password.util';

import {
  ACCOUNTS_CREATED_AT,
  CAPACITY_VALID_FROM,
  COMPANY,
  SEED_PASSWORD,
  USERS,
} from './seed-config';

const DEFAULT_MINUTES_PER_WEEK = COMPANY.standardWorkHoursPerDay * 60 * 5;

export async function seedUsers(dataSource: DataSource, companyId: string) {
  const userRepo = dataSource.getRepository(User);
  const capacityRepo = dataSource.getRepository(UserCapacity);
  const passwordHash = await hashPassword(SEED_PASSWORD);

  for (const data of USERS) {
    const existing = await userRepo.findOneBy({ companyId, email: data.email });

    if (existing) continue;

    const user = await userRepo.save(
      userRepo.create({
        companyId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        position: data.position,
        passwordHash,
        status: data.status ?? UserStatus.ACTIVE,
        deactivatedAt: data.deactivatedOn
          ? new Date(`${data.deactivatedOn}T00:00:00Z`)
          : null,
        createdAt: data.joinedOn
          ? new Date(`${data.joinedOn}T00:00:00Z`)
          : ACCOUNTS_CREATED_AT,
      }),
    );

    // Only people who differ from the company default need a row.
    const minutesPerWeek = data.capacityHoursPerWeek * 60;
    if (minutesPerWeek !== DEFAULT_MINUTES_PER_WEEK) {
      await capacityRepo.save(
        capacityRepo.create({
          companyId,
          userId: user.id,
          validFrom: CAPACITY_VALID_FROM,
          minutesPerWeek,
        }),
      );
    }

    if (data.capacityFrom) {
      await capacityRepo.save(
        capacityRepo.create({
          companyId,
          userId: user.id,
          validFrom: data.capacityFrom.validFrom,
          minutesPerWeek: data.capacityFrom.hoursPerWeek * 60,
        }),
      );
    }
  }

  console.log(`✅ Users seeded (${USERS.length})`);
}

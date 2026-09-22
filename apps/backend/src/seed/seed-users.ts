import { DataSource } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { UserStatus } from 'src/users/enums/user-role.enum';
import { UserCapacity } from 'src/capacity/entities/user-capacity.entity';
import { hashPassword } from 'src/lib/utils/hash-password.util';

import {
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
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        position: data.position,
        passwordHash,
        status: UserStatus.ACTIVE,
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
  }

  console.log(`✅ Users seeded (${USERS.length})`);
}

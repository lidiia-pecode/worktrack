import { DataSource } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { UserStatus } from 'src/users/enums/UserRole.enum';
import { hashPassword } from 'src/lib/utils/hash-password.util';

import { SEED_PASSWORD, USERS } from './seed-config';

export async function seedUsers(dataSource: DataSource, companyId: string) {
  const userRepo = dataSource.getRepository(User);
  const passwordHash = await hashPassword(SEED_PASSWORD);

  for (const data of USERS) {
    const existing = await userRepo.findOneBy({ companyId, email: data.email });

    if (!existing) {
      await userRepo.save(
        userRepo.create({
          companyId,
          email: data.email,
          username: data.username,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
          position: data.position,
          capacityHoursPerWeek: data.capacityHoursPerWeek,
          passwordHash,
          status: UserStatus.ACTIVE,
        }),
      );
    }
  }

  console.log(`✅ Users seeded (${USERS.length})`);
}

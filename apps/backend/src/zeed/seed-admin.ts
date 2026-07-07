// npm run seed:admin
// credentials: password - Yuraloh2002; email: admin@gmail.com

import 'reflect-metadata';
import { hashPassword } from '../lib/utils/hash-password.util';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/UserRole.enum';
import { DataSource } from 'typeorm';

export async function seedAdmin(dataSource: DataSource) {
  const userRepo = dataSource.getRepository(User);

  const email = 'admin@gmail.com';

  const existing = await userRepo.findOneBy({ email });

  if (existing) {
    console.log('✅ SUPER_ADMIN already exists');
    return;
  }

  const passwordHash = await hashPassword('Yuraloh2002');

  const superAdmin = userRepo.create({
    email,
    username: 'super-admin',
    firstName: 'Super',
    lastName: 'Admin',
    password: passwordHash,
    role: UserRole.SUPER_ADMIN,
  });

  await userRepo.save(superAdmin);

  console.log('✅ SUPER_ADMIN created');
}

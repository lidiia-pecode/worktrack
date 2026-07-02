// npm run seed:admin
// credentials: password - Yuraloh2002; email: admin@gmail.com

import 'reflect-metadata';
import { AppDataSource } from '../src/data-source';
import { hashPassword } from '../src/lib/utils/hash-password.util';
import { User } from '../src/users/entities/user.entity';
import { UserRole } from './users/enums/UserRole.enum';

async function run() {
  await AppDataSource.initialize();

  const userRepo = AppDataSource.getRepository(User);

  const email = 'admin@gmail.com';

  const existing = await userRepo.findOneBy({ email });

  if (existing) {
    console.log('SUPER_ADMIN already exists');
    await AppDataSource.destroy();
    return;
  }

  const passwordHash = await hashPassword('yuraloh2002');

  const superAdmin = userRepo.create({
    email,
    username: 'super-admin',
    firstName: 'Super',
    lastName: 'Admin',
    password: passwordHash,
    role: UserRole.SUPER_ADMIN,
  });

  await userRepo.save(superAdmin);

  console.log('SUPER_ADMIN created successfully');

  await AppDataSource.destroy();
}

run().catch(console.error);

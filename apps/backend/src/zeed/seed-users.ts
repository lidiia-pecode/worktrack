import { DataSource } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { UserRole, UserStatus } from 'src/users/enums/UserRole.enum';
import { hashPassword } from 'src/lib/utils/hash-password.util';

export async function seedUsers(dataSource: DataSource, companyId: string) {
  // 1. Отримуємо стандартний TypeORM Repository для сутності User
  const userRepo = dataSource.getRepository(User);

  // Хеш пароля для "Password123!"
  const passwordHash = await hashPassword('Password123!');

  const usersData = [
    {
      email: 'owner@techcorp.com',
      username: 'owner',
      firstName: 'Alex',
      lastName: 'Owner',
      role: UserRole.OWNER,
      position: 'CEO',
      capacityHoursPerWeek: 40,
    },
    {
      email: 'manager@techcorp.com',
      username: 'manager',
      firstName: 'Sarah',
      lastName: 'Manager',
      role: UserRole.MANAGER,
      position: 'Engineering Lead',
      capacityHoursPerWeek: 40,
    },
    {
      email: 'employee1@techcorp.com',
      username: 'john_dev',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.EMPLOYEE,
      position: 'Senior Backend Developer',
      capacityHoursPerWeek: 40,
    },
    {
      email: 'employee2@techcorp.com',
      username: 'jane_dev',
      firstName: 'Jane',
      lastName: 'Smith',
      role: UserRole.EMPLOYEE,
      position: 'Frontend Developer',
      capacityHoursPerWeek: 40,
    },
  ];

  for (const data of usersData) {
    // 2. Перевіряємо існування через ORM findOneBy
    const existing = await userRepo.findOneBy({ email: data.email });

    if (!existing) {
      // 3. Створюємо екземпляр сутності (TypeORM заповнить дефолтні значення)
      const user = userRepo.create({
        ...data,
        companyId,
        passwordHash,
        status: UserStatus.ACTIVE,
      });

      // 4. Зберігаємо сутність
      await userRepo.save(user);
    }
  }

  console.log('✅ Users seeded successfully using Repository');
}

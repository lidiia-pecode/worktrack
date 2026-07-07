import { DataSource } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { UserRole } from 'src/users/enums/UserRole.enum';
import { hashPassword } from 'src/lib/utils/hash-password.util';

export async function seedUsers(dataSource: DataSource) {
  const repo = dataSource.getRepository(User);

  const password = await hashPassword('Password123');

  await repo.upsert(
    [
      {
        firstName: 'John',
        lastName: 'Doe',
        username: 'john',
        email: 'john@example.com',
        password,
        role: UserRole.USER,
      },
      {
        firstName: 'Alice',
        lastName: 'Johnson',
        username: 'alice',
        email: 'alice@example.com',
        password,
        role: UserRole.USER,
      },
      {
        firstName: 'Bob',
        lastName: 'Smith',
        username: 'bob',
        email: 'bob@example.com',
        password,
        role: UserRole.USER,
      },
      {
        firstName: 'Emma',
        lastName: 'Brown',
        username: 'emma',
        email: 'emma@example.com',
        password,
        role: UserRole.USER,
      },
      {
        firstName: 'Michael',
        lastName: 'Wilson',
        username: 'michael',
        email: 'michael@example.com',
        password,
        role: UserRole.USER,
      },
    ],
    {
      conflictPaths: ['email'],
    },
  );

  console.log('✅ Users seeded');
}

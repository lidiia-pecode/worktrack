import { NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';

import { User } from './entities/user.entity';

/**
 * Locks the person's row until the transaction ends, so writes for one person
 * run one after the other and the second sees the first.
 */
export async function lockUser(
  manager: EntityManager,
  userId: string,
  companyId: string,
): Promise<User> {
  const user = await manager.findOne(User, {
    where: { id: userId, companyId },
    lock: { mode: 'pessimistic_write' },
  });

  if (!user) {
    throw new NotFoundException(
      `User with id ${userId} not found in this company`,
    );
  }

  return user;
}

import type { UUID } from 'node:crypto';
import { User } from 'src/users/entities/user.entity';

import { Column, Entity, ManyToOne, PrimaryColumn, JoinColumn } from 'typeorm';

@Entity({ name: 'auth_sessions' })
export class AuthSession {
  @PrimaryColumn({ type: 'uuid' })
  id!: UUID;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'varchar', length: 64 })
  refreshHash!: string;
}

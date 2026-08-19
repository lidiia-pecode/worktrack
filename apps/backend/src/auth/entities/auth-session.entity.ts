// apps/backend/src/auth/entities/auth-session.entity.ts
import { Company } from 'src/companies/entities/company.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
  Index,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'auth_sessions' })
@Index('IDX_auth_sessions_user_id', ['userId'])
@Index('IDX_auth_sessions_company_id', ['companyId'])
export class AuthSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company?: Company;

  @Column({ type: 'varchar', length: 64 })
  refreshHash!: string;

  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
    name: 'previous_refresh_hash',
  })
  previousRefreshHash?: string | null;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    name: 'rotated_at',
  })
  rotatedAt?: Date | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent?: string;

  @Column({
    type: 'timestamp with time zone',
    name: 'last_activity_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  lastActivityAt!: Date;

  @Index('IDX_auth_sessions_expires_at')
  @Column({ type: 'timestamp with time zone' })
  expiresAt!: Date;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt!: Date;
}

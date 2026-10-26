import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Company } from 'src/companies/entities/company.entity';
import { User } from './user.entity';

/** A finished deactivation spell; one still running is `User.deactivatedAt`. */
@Entity('user_inactive_periods')
@Check(`"reactivated_at" >= "deactivated_at"`)
@Index('IDX_user_inactive_periods_company_user', ['companyId', 'userId'])
export class UserInactivePeriod {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'company_id', nullable: false })
  companyId!: string;

  @Column({ type: 'uuid', name: 'user_id', nullable: false })
  userId!: string;

  @Column({
    type: 'timestamp with time zone',
    name: 'deactivated_at',
    nullable: false,
  })
  deactivatedAt!: Date;

  @Column({
    type: 'timestamp with time zone',
    name: 'reactivated_at',
    nullable: false,
  })
  reactivatedAt!: Date;

  // ==========================================
  // RELATIONS
  // ==========================================

  @ManyToOne(() => Company, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}

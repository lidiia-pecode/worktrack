import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Company } from 'src/companies/entities/company.entity';
import { User } from 'src/users/entities/user.entity';

/**
 * Contracted minutes per week, effective from a date. A change is a new row
 * rather than an edit, so a week that has already been worked keeps the figure
 * it was measured against.
 */
@Entity('user_capacities')
@Check(`"minutes_per_week" >= 0 AND "minutes_per_week" <= 10080`)
@Index(
  'UQ_user_capacities_company_user_valid_from',
  ['companyId', 'userId', 'validFrom'],
  { unique: true },
)
export class UserCapacity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'uuid',
    name: 'company_id',
    nullable: false,
  })
  companyId!: string;

  @Column({
    type: 'uuid',
    name: 'user_id',
    nullable: false,
  })
  userId!: string;

  @Column({
    type: 'uuid',
    name: 'created_by_id',
    nullable: true,
  })
  createdById?: string;

  @Column({ type: 'date', name: 'valid_from', nullable: false })
  validFrom!: string;

  @Column({ type: 'int', name: 'minutes_per_week', nullable: false })
  minutesPerWeek!: number;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt!: Date;

  // ==========================================
  // RELATIONS
  // ==========================================

  @ManyToOne(() => Company, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @ManyToOne(() => User, (user) => user.capacities, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: User;
}

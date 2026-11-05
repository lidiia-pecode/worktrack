import {
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
 * The company's standard day from a date. Before the first row, the company's
 * own `standardWorkHoursPerDay` applies, from its start.
 */
@Entity('company_standard_days')
@Index(
  'UQ_company_standard_days_company_valid_from',
  ['companyId', 'validFrom'],
  { unique: true },
)
export class CompanyStandardDay {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'company_id', nullable: false })
  companyId!: string;

  @Column({ type: 'uuid', name: 'created_by_id', nullable: true })
  createdById?: string;

  @Column({ type: 'date', name: 'valid_from', nullable: false })
  validFrom!: string;

  @Column({
    type: 'decimal',
    name: 'hours_per_day',
    precision: 4,
    scale: 2,
    nullable: false,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  hoursPerDay!: number;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Company, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: User;
}

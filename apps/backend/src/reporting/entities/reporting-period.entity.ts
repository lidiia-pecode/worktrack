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
import { ReportingPeriodStatus } from '../enums/reporting-period-status.enum';

@Entity('reporting_periods')
@Check(`EXTRACT(DAY FROM "month") = 1`)
@Index('UQ_reporting_periods_company_month', ['companyId', 'month'], {
  unique: true,
})
export class ReportingPeriod {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'uuid',
    name: 'company_id',
    nullable: false,
  })
  companyId!: string;

  /** The first day of the month. */
  @Column({ type: 'date', nullable: false })
  month!: string;

  @Column({
    type: 'enum',
    enum: ReportingPeriodStatus,
    enumName: 'reporting_period_status_enum',
    nullable: false,
  })
  status!: ReportingPeriodStatus;

  @Column({
    type: 'uuid',
    name: 'changed_by_id',
    nullable: true,
  })
  changedById?: string | null;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    name: 'created_at',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    name: 'updated_at',
  })
  updatedAt!: Date;

  // ==========================================
  // RELATIONS
  // ==========================================

  @ManyToOne(() => Company, (company) => company.reportingPeriods, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'changed_by_id' })
  changedBy?: User | null;
}

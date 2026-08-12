import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Check,
} from 'typeorm';

import { Company } from 'src/companies/entities/company.entity';
import { ReportingPeriodStatus } from '../enum/reporting-period-status.enum';

@Entity('reporting_periods')
@Check(`"end_date" >= "start_date"`)
@Index('UQ_reporting_periods_company_name', ['companyId', 'name'], {
  unique: true,
})
@Index('IDX_reporting_periods_company_dates', [
  'companyId',
  'startDate',
  'endDate',
])
export class ReportingPeriod {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'uuid',
    name: 'company_id',
    nullable: false,
  })
  companyId!: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  name!: string;

  @Column({
    type: 'date',
    name: 'start_date',
    nullable: false,
  })
  startDate!: string;

  @Column({
    type: 'date',
    name: 'end_date',
    nullable: false,
  })
  endDate!: string;

  @Column({
    type: 'enum',
    enum: ReportingPeriodStatus,
    enumName: 'reporting_period_status_enum',
    default: ReportingPeriodStatus.OPEN,
    nullable: false,
  })
  status!: ReportingPeriodStatus;

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
}

import { Activity } from 'src/activities/entities/activity.entity';
import { ActCategory } from 'src/activity-categories/entities/activities-category.entity';
import { Project } from 'src/projects/entities/project.entity';
import { ReportingPeriod } from 'src/reporting/entities/reporting-period.entity';
import { Team } from 'src/teams/entities/team.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum WeekDay {
  MONDAY = 'MONDAY',
  SUNDAY = 'SUNDAY',
}

/**
 * Company Status Enum
 * ACTIVE: Normal tenant operations.
 * SUSPENDED: Reserved for future billing-driven account locks.
 */
export enum CompanyStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

@Entity({ name: 'companies' })
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  name!: string;

  @Index('UQ_companies_slug', { unique: true })
  @Column({ type: 'varchar', length: 100, nullable: false })
  slug!: string;

  @Column({ type: 'enum', enum: CompanyStatus, default: CompanyStatus.ACTIVE })
  status!: CompanyStatus;

  @Column({ type: 'varchar', length: 50, default: 'UTC' })
  timezone!: string;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency!: string;

  @Column({ type: 'enum', enum: WeekDay, default: WeekDay.MONDAY })
  weekStartDay!: WeekDay;

  @Column({ type: 'decimal', precision: 4, scale: 2, default: 8.0 })
  standardWorkHoursPerDay!: number;

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

  @DeleteDateColumn({
    type: 'timestamp with time zone',
    name: 'deleted_at',
    nullable: true,
  })
  deletedAt?: Date;

  // ==========================================
  // RELATIONS (Tenant Root Boundary)
  // ==========================================

  @OneToMany(() => User, (user) => user.company, {
    cascade: false,
  })
  users!: User[];

  @OneToMany(() => Team, (team) => team.company, {
    cascade: false,
  })
  teams!: Team[];

  @OneToMany(() => Project, (project) => project.company, {
    cascade: false,
  })
  projects!: Project[];

  @OneToMany(() => Activity, (activity) => activity.company, {
    cascade: false,
  })
  activities!: Activity[];

  @OneToMany(() => ActCategory, (category) => category.company, {
    cascade: false,
  })
  actCategories!: ActCategory[];

  @OneToMany(
    () => ReportingPeriod,
    (reportingPeriod) => reportingPeriod.company,
    {
      cascade: false,
    },
  )
  reportingPeriods!: ReportingPeriod[];
}

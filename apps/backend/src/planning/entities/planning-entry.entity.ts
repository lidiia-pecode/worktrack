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
import { ProjectActivity } from 'src/projects/entities/project-activity.entity';

@Entity('planning_entries')
@Check(`"planned_minutes" > 0 AND "planned_minutes" <= 1440`)
@Index(
  'UQ_planning_company_user_activity_date',
  ['companyId', 'userId', 'projectActivityId', 'date'],
  {
    unique: true,
  },
)
@Index('IDX_planning_company_user_date', ['companyId', 'userId', 'date'])
@Index('IDX_planning_company_activity_date', [
  'companyId',
  'projectActivityId',
  'date',
])
export class PlanningEntry {
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
    name: 'project_activity_id',
    nullable: false,
  })
  projectActivityId!: string;

  @Column({
    type: 'uuid',
    name: 'created_by_id',
    nullable: true,
  })
  createdById?: string;

  @Column({
    type: 'date',
    nullable: false,
  })
  date!: string;

  @Column({
    type: 'int',
    name: 'planned_minutes',
    nullable: false,
  })
  plannedMinutes!: number;

  @Column({
    type: 'text',
    nullable: true,
  })
  note?: string;

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

  @ManyToOne(() => Company, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @ManyToOne(() => User, (user) => user.planningEntries, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => ProjectActivity, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'project_activity_id' })
  projectActivity!: ProjectActivity;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: User;
}

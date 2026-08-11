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

@Entity('time_logs')
@Check(`"minutes" > 0 AND "minutes" <= 1440`)
@Index('IDX_time_logs_company_user_date', ['companyId', 'userId', 'date'])
@Index('IDX_time_logs_company_activity_date', [
  'companyId',
  'projectActivityId',
  'date',
])
export class TimeLog {
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

  @Column({ type: 'boolean', name: 'is_billable', default: true })
  isBillable!: boolean;

  @Column({ type: 'int', name: 'minutes', nullable: false })
  minutes!: number;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'date', nullable: false })
  date!: string;

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

  @ManyToOne(() => User, (user) => user.timeLogs, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => ProjectActivity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'project_activity_id' })
  projectActivity!: ProjectActivity;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { Project } from 'src/projects/entities/project.entity';
import { Activity } from 'src/activities/entities/activity.entity';
import { Company } from 'src/companies/entities/company.entity';

@Index('IDX_project_activities_company_id', ['companyId'])
@Index('IDX_project_activities_activity_id', ['activityId'])
@Unique(['projectId', 'activityId'])
@Entity('project_activities')
export class ProjectActivity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'boolean',
    name: 'is_active',
    default: true,
    nullable: false,
  })
  isActive!: boolean;

  @Column({ type: 'uuid', name: 'company_id', nullable: false })
  companyId!: string;

  @Column({ type: 'uuid', name: 'project_id', nullable: false })
  projectId!: string;

  @Column({ type: 'uuid', name: 'activity_id', nullable: false })
  activityId!: string;

  // ==========================================
  // RELATIONS
  // ==========================================

  @ManyToOne(() => Company, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @ManyToOne(() => Project, (project) => project.projectActivities, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @ManyToOne(() => Activity, (activity) => activity.projectActivities, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'activity_id' })
  activity!: Activity;

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
}

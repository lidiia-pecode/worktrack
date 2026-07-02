import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { Project } from 'src/projects/entities/project.entity';
import { Activity } from 'src/activities/entities/activity.entity';

@Unique(['project', 'activity'])
@Entity('project_activities')
export class ProjectActivity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ default: true })
  isActive!: boolean;

  @ManyToOne(() => Project, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @RelationId((pa: ProjectActivity) => pa.project)
  projectId!: string;

  @ManyToOne(() => Activity, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'activity_id' })
  activity!: Activity;

  @RelationId((pa: ProjectActivity) => pa.activity)
  activityId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

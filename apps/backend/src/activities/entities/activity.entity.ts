import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Company } from 'src/companies/entities/company.entity';
import { ActCategory } from 'src/activity-categories/entities/activities-category.entity';
import { ProjectActivity } from 'src/projects/entities/project-activity.entity';
import { ActivityStatus } from '../enums/activity-status.enum';

@Entity('activities')
@Index('IDX_activities_company_id', ['companyId'])
@Index('IDX_activities_category_id', ['categoryId'])
@Index('UQ_activities_company_name_lower', {
  synchronize: false,
})
export class Activity {
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
    type: 'boolean',
    name: 'default_billable',
    default: true,
    nullable: false,
  })
  defaultBillable!: boolean;

  @Column({
    type: 'enum',
    enum: ActivityStatus,
    enumName: 'activity_status_enum',
    default: ActivityStatus.ACTIVE,
  })
  status!: ActivityStatus;

  /** None while it is a draft; it needs one before it can go on a project. */
  @Column({
    type: 'uuid',
    name: 'category_id',
    nullable: true,
  })
  categoryId!: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt!: Date;

  // ==========================================
  // RELATIONS
  // ==========================================

  @ManyToOne(() => Company, (company) => company.activities, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @ManyToOne(() => ActCategory, (category) => category.activities, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'category_id' })
  category!: ActCategory | null;

  @OneToMany(
    () => ProjectActivity,
    (projectActivity) => projectActivity.activity,
    { cascade: false },
  )
  projectActivities!: ProjectActivity[];
}

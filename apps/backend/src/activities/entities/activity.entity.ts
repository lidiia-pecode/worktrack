import {
  Column,
  CreateDateColumn,
  Entity,
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
    name: 'is_absence',
    default: false,
    nullable: false,
  })
  isAbsence!: boolean;

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

  @Column({
    type: 'uuid',
    name: 'category_id',
    nullable: false,
  })
  categoryId!: string;

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
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'category_id' })
  category!: ActCategory;

  @OneToMany(
    () => ProjectActivity,
    (projectActivity) => projectActivity.activity,
    { cascade: false },
  )
  projectActivities!: ProjectActivity[];
}

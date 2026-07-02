import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';

import { ActCategory } from 'src/activity-categories/entities/activities-category.entity';
import { ProjectActivity } from 'src/projects/entities/project-activity.entity';

@Entity('activities')
export class Activity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'varchar',
    length: 100,
    unique: true,
  })
  name!: string;

  @ManyToOne(() => ActCategory, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'category_id' })
  category!: ActCategory;

  @RelationId((activity: Activity) => activity.category)
  categoryId!: string;

  @OneToMany(
    () => ProjectActivity,
    (projectActivity) => projectActivity.activity,
  )
  projectActivities!: ProjectActivity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

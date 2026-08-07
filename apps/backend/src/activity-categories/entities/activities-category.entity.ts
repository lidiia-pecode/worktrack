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
import { Activity } from 'src/activities/entities/activity.entity';
import { ActCategoryStatus } from '../enums/category-status';

@Entity('act_categories')
export class ActCategory {
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
    type: 'enum',
    enum: ActCategoryStatus,
    enumName: 'act_category_status_enum',
    default: ActCategoryStatus.ACTIVE,
  })
  status!: ActCategoryStatus;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt!: Date;

  // ==========================================
  // RELATIONS
  // ==========================================

  @ManyToOne(() => Company, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @OneToMany(() => Activity, (activity) => activity.category, {
    cascade: false,
  })
  activities!: Activity[];
}

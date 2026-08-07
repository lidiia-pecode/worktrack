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
import { ProjectActivity } from './project-activity.entity';
import { ProjectStatus } from '../enums/project-status.enum';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'company_id', nullable: false })
  companyId!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name!: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'client_name',
    default: null,
  })
  clientName?: string | null;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    enumName: 'project_status_enum',
    default: ProjectStatus.ACTIVE,
  })
  status!: ProjectStatus;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt!: Date;

  // ==========================================
  // RELATIONS
  // ==========================================

  @ManyToOne(() => Company, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @OneToMany(() => ProjectActivity, (pa) => pa.project, { cascade: false })
  projectActivities!: ProjectActivity[];
}

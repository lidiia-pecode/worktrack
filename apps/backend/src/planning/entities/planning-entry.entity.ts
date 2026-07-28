import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Project } from 'src/projects/entities/project.entity';

@Unique('UQ_planning_employee_project_date', ['employee', 'project', 'date'])
@Index('IDX_planning_employee_date', ['employee', 'date'])
@Index('IDX_planning_project_date', ['project', 'date'])
@Entity('planning_entries')
@Check(`"time" > 0 AND "time" <= 1440`)
export class PlanningEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'employee_id' })
  employee!: User;

  @RelationId((planning: PlanningEntry) => planning.employee)
  employeeId!: string;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'created_by' })
  createdBy?: User;

  @RelationId((planning: PlanningEntry) => planning.createdBy)
  createdById?: string;

  @ManyToOne(() => Project, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @RelationId((planning: PlanningEntry) => planning.project)
  projectId!: string;

  @Column({
    type: 'int',
  })
  time!: number;

  @Column({
    type: 'text',
    nullable: true,
  })
  note?: string;

  @Column({
    type: 'date',
  })
  date!: string;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt!: Date;
}

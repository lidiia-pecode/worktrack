import { User } from 'src/users/entities/user.entity';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';
import { ProjectActivity } from 'src/projects/entities/project-activity.entity';

@Entity('time_logs')
export class TimeLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @RelationId((t: TimeLog) => t.user)
  userId!: string;

  @ManyToOne(() => ProjectActivity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'project_activity_id' })
  projectActivity!: ProjectActivity;

  @RelationId((t: TimeLog) => t.projectActivity)
  projectActivityId!: string;

  @Column({ type: 'boolean', default: true })
  isBillable!: boolean;

  @Column({ type: 'int' })
  @Check(`"time" > 0 AND "time" <= 1440`)
  time!: number;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'date' })
  date!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

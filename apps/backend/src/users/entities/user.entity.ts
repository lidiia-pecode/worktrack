import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from 'src/projects/entities/project.entity';
import { Company } from 'src/companies/entities/company.entity';
import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { TimeLog } from 'src/time-logs/entities/time-log.entity';
import { PlanningEntry } from 'src/planning/entities/planning-entry.entity';
import { UserRole, UserStatus } from '../enums/UserRole.enum';

@Entity('users')
@Index('UQ_users_username', ['username'], {
  unique: true,
  where: 'username IS NOT NULL',
})
@Index('UQ_users_google_id', ['googleId'], {
  unique: true,
  where: 'google_id IS NOT NULL',
})
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'uuid',
    name: 'company_id',
    nullable: false,
  })
  companyId!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    enumName: 'user_role_enum',
    default: UserRole.EMPLOYEE,
  })
  role!: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    enumName: 'user_status_enum',
    default: UserStatus.ACTIVE,
  })
  status!: UserStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  position?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatarUrl?: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  firstName!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  lastName!: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  username?: string;

  @Column({ type: 'varchar', length: 255, nullable: false, unique: true })
  email!: string;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'password_hash',
    nullable: true,
  })
  passwordHash?: string;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'google_id',
    nullable: true,
  })
  googleId?: string;

  @Column({
    type: 'numeric',
    name: 'capacity_hours_per_week',
    precision: 5,
    scale: 2,
    default: 40,
    nullable: false,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  capacityHoursPerWeek!: number;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt!: Date;

  // ==========================================
  // RELATIONS
  // ==========================================

  @ManyToOne(() => Company, (company) => company.users, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @OneToMany(() => TeamMembership, (membership) => membership.user, {
    cascade: false,
  })
  teamMemberships!: TeamMembership[];

  @OneToMany(() => TimeLog, (timeLog) => timeLog.user, {
    cascade: false,
  })
  timeLogs!: TimeLog[];

  @OneToMany(() => PlanningEntry, (planning) => planning.user, {
    cascade: false,
  })
  planningEntries!: PlanningEntry[];

  @ManyToMany(() => Project, (project) => project.users)
  projects?: Project[];
}

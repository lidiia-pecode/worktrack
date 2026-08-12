import { Company } from 'src/companies/entities/company.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { TeamMembership } from './team-membership.entity';
import { TeamStatus } from '../enums/team-status.enum';

@Entity({ name: 'teams' })
@Index('UQ_teams_company_name', ['companyId', 'name'], { unique: true })
export class Team {
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
    length: 255,
    nullable: false,
  })
  name!: string;

  @Column({
    type: 'enum',
    enum: TeamStatus,
    enumName: 'team_status_enum',
    default: TeamStatus.ACTIVE,
    nullable: false,
  })
  status!: TeamStatus;

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

  // ==========================================
  // RELATIONS
  // ==========================================

  // /**
  //  * Root Tenant isolation boundary.
  //  */
  @ManyToOne(() => Company, (company) => company.teams, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  // /**
  //  * Time-bounded member associations for historical tracking.
  //  */
  @OneToMany(() => TeamMembership, (membership) => membership.team, {
    cascade: false,
  })
  memberships!: TeamMembership[];
}

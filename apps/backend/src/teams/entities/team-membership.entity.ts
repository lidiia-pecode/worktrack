import { Company } from 'src/companies/entities/company.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { Team } from './team.entity';
import { User } from 'src/users/entities/user.entity';

/**
 * Role within a specific team.
 * MEMBER: Standard team contributor.
 * MANAGER: Manages the team and creates/edits allocations.
 */
export enum TeamRole {
  MEMBER = 'MEMBER',
  MANAGER = 'MANAGER',
}

@Entity({ name: 'team_memberships' })
@Check(`"left_at" IS NULL OR "left_at" >= "joined_at"`)
@Index('IDX_team_memberships_company_id', ['companyId'])
@Index('IDX_team_memberships_user_lookup', ['userId', 'joinedAt', 'leftAt'])
@Index('IDX_team_memberships_team_lookup', ['teamId', 'joinedAt', 'leftAt'])
export class TeamMembership {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Denormalized tenant ID to enable efficient Row-Level Security (RLS) policies.
   */
  @Column({
    type: 'uuid',
    name: 'company_id',
    nullable: false,
  })
  companyId!: string;

  @Column({
    type: 'uuid',
    name: 'team_id',
    nullable: false,
  })
  teamId!: string;

  @Column({
    type: 'uuid',
    name: 'user_id',
    nullable: false,
  })
  userId!: string;

  @Column({
    type: 'enum',
    enum: TeamRole,
    enumName: 'team_role_enum',
    default: TeamRole.MEMBER,
    name: 'role_in_team',
    nullable: false,
  })
  roleInTeam!: TeamRole;

  @Column({
    type: 'date',
    name: 'joined_at',
    nullable: false,
  })
  joinedAt!: string;

  @Column({
    type: 'date',
    name: 'left_at',
    nullable: true,
    default: null,
  })
  leftAt!: string | null;

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

  @ManyToOne(() => Company, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @ManyToOne(() => Team, (team) => team.memberships, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'team_id' })
  team!: Team;

  @ManyToOne(() => User, (user) => user.teamMemberships, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Company } from 'src/companies/entities/company.entity';
import { Team } from 'src/teams/entities/team.entity';
import { User } from 'src/users/entities/user.entity';
import { UserRole } from 'src/users/enums/user-role.enum';
import { InvitationStatus } from '../enums/invitation-status.enum';

@Entity('invitations')
@Index('IDX_invitations_company_id', ['companyId'])
@Index('IDX_invitations_token_hash', ['tokenHash'], { unique: true })
@Index('IDX_invitations_email', ['email'])
@Index('UQ_invitations_pending_company_email', ['companyId', 'email'], {
  unique: true,
  where: "status = 'PENDING'",
})
export class Invitation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'uuid',
    name: 'company_id',
    nullable: false,
  })
  companyId!: string;

  @Column({
    type: 'uuid',
    name: 'team_id',
    nullable: true,
  })
  teamId!: string | null;

  @Column({
    type: 'uuid',
    name: 'invited_by_id',
    nullable: true,
  })
  invitedById!: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  email!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    enumName: 'user_role_enum',
    default: UserRole.EMPLOYEE,
  })
  role!: UserRole;

  @Column({
    type: 'enum',
    enum: InvitationStatus,
    enumName: 'invitation_status_enum',
    default: InvitationStatus.PENDING,
  })
  status!: InvitationStatus;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'token_hash',
    nullable: false,
  })
  tokenHash!: string;

  @Column({
    type: 'timestamp with time zone',
    name: 'expires_at',
    nullable: false,
  })
  expiresAt!: Date;

  @Column({
    type: 'timestamp with time zone',
    name: 'accepted_at',
    nullable: true,
  })
  acceptedAt?: Date;

  @Column({
    type: 'timestamp with time zone',
    name: 'revoked_at',
    nullable: true,
  })
  revokedAt?: Date;

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

  @ManyToOne(() => Company, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  // An invitation is history, so it outlives the team it was for and the
  // person who sent it.
  @ManyToOne(() => Team, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'team_id' })
  team!: Team | null;

  @ManyToOne(() => User, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'invited_by_id' })
  invitedBy!: User | null;
}

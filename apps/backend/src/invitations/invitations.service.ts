// apps/backend/src/invitations/invitations.service.ts

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';

import { UserRole } from 'src/users/enums/user-role.enum';
import { UsersService } from 'src/users/users.service';
import { MailService } from 'src/mail/mail.service';
import { SessionService } from 'src/auth/services/session.service';
import { PasswordService } from 'src/auth/services/password.service';
import { TeamVisibilityService } from 'src/teams/team-visibility.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { findActiveTeam } from 'src/teams/find-active-team.util';
import { Team } from 'src/teams/entities/team.entity';
import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { TeamRole } from 'src/teams/enums/team-role.enum';
import { TeamStatus } from 'src/teams/enums/team-status.enum';
import { findCompanyToday } from 'src/companies/company-today.util';
import type { SessionMetadata } from 'src/lib/types/session-metadata';
import type { GoogleUserPayload } from 'src/auth/dtos/auth.dto';
import type { AuthUser } from 'src/auth/auth-strategies/types';

import { Invitation } from './entities/invitation.entity';
import { InvitationStatus } from './enums/invitation-status.enum';
import {
  INVITATION_VALID_DAYS,
  INVITATION_VALID_MS,
} from './invitation.constants';
import {
  UnusableInvitationCode,
  unusableInvitation,
} from './unusable-invitation';
import { AuthErrorCode, authError } from 'src/auth/auth-error';
import type { CreateInvitationPayload } from './dtos/create-invitation.dto';
import { User } from 'src/users/entities/user.entity';

export type PendingInvitation = Invitation & { expired: boolean };

const fullName = (user: User | null): string | null =>
  user ? `${user.firstName} ${user.lastName}` : null;

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(Invitation)
    private readonly invitationRepository: Repository<Invitation>,

    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly sessionService: SessionService,
    private readonly passwordService: PasswordService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly teamVisibility: TeamVisibilityService,

    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,

    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    companyId: string,
    payload: CreateInvitationPayload,
    user: AuthUser,
  ): Promise<void> {
    const email = this.normalizeEmail(payload.email);

    this.validateInvitationRole(payload.role, user.role);

    const teamId = await this.resolveInvitationTeamId(companyId, payload, user);

    const existingUser = await this.usersService.findByEmailWithCompany(email);

    if (existingUser) {
      if (existingUser.companyId === companyId) {
        throw new ConflictException(
          'A user with this email already belongs to this company',
        );
      }

      // Says nothing about the account or the company it belongs to.
      throw new ConflictException('This email address cannot be invited');
    }

    const existingInvitation = await this.invitationRepository.findOne({
      where: {
        companyId,
        email,
        status: InvitationStatus.PENDING,
      },
    });

    if (existingInvitation && existingInvitation.expiresAt > new Date()) {
      throw new ConflictException(
        'An active invitation already exists for this email',
      );
    }

    const invitation = this.invitationRepository.create({
      companyId,
      teamId,
      invitedById: user.id,
      email,
      role: payload.role,
      status: InvitationStatus.PENDING,
    });

    await this.saveWithNewLinkAndSend(invitation, existingInvitation);
  }

  /** Expired invitations stay listed, marked, so they can be resent. */
  async listPending(user: AuthUser): Promise<PendingInvitation[]> {
    const visibleTeamIds = await this.teamVisibility.getVisibleTeamIds(user);

    if (visibleTeamIds?.length === 0) {
      return [];
    }

    const invitations = await this.invitationRepository.find({
      where: {
        companyId: user.companyId,
        status: InvitationStatus.PENDING,
        ...(visibleTeamIds
          ? { teamId: In(visibleTeamIds), role: UserRole.EMPLOYEE }
          : {}),
      },
      relations: { team: true, invitedBy: true },
      order: { createdAt: 'DESC' },
    });

    const now = new Date();

    return invitations.map((invitation) =>
      Object.assign(invitation, { expired: invitation.expiresAt <= now }),
    );
  }

  async resend(id: string, user: AuthUser): Promise<void> {
    const invitation = await this.findPendingInScope(id, user);

    await this.saveWithNewLinkAndSend(invitation);
  }

  async revoke(id: string, user: AuthUser): Promise<void> {
    const invitation = await this.findPendingInScope(id, user);

    invitation.status = InvitationStatus.REVOKED;
    invitation.revokedAt = new Date();

    await this.invitationRepository.save(invitation);
  }

  /** Refuses an unusable token with the same codes the invitation page reads. */
  async assertUsableToken(token: string): Promise<void> {
    await this.findOpenableInvitation(token);
  }

  /** What the invitation page shows before the person accepts. */
  async describeByToken(token: string) {
    const invitation = await this.findOpenableInvitation(token);

    return {
      email: invitation.email,
      role: invitation.role,
      companyName: invitation.company.companyName,
      inviterName: fullName(invitation.invitedBy),
      teamName: invitation.team?.name ?? null,
      expiresAt: invitation.expiresAt,
    };
  }

  async completeWithPassword(
    token: string,
    password: string,
    firstName: string,
    lastName: string,
    metadata?: SessionMetadata,
  ) {
    const user = await this.dataSource.transaction(async (manager) => {
      const invitationRepository = manager.getRepository(Invitation);

      const userRepository = manager.getRepository(User);

      const invitation = await this.findValidInvitation(
        token,
        invitationRepository,
      );

      const email = this.normalizeEmail(invitation.email);

      const existingUser = await userRepository.findOne({
        where: { email },
      });

      if (existingUser) {
        throw new ConflictException('A user with this email already exists');
      }

      const passwordHash = await this.passwordService.hash(password);

      const user = await this.usersService.createInvitedUser(
        {
          companyId: invitation.companyId,
          email,
          role: invitation.role,
          firstName,
          lastName,
          passwordHash,
        },
        manager,
      );

      await this.createInvitationMembership(invitation, user.id, manager);

      await this.acceptInvitation(invitation, user.id, manager);

      return user;
    });

    return this.sessionService.createSession(user, metadata);
  }

  async completeWithGoogle(
    token: string,
    googleUser: GoogleUserPayload,
    metadata?: SessionMetadata,
  ) {
    const user = await this.dataSource.transaction(async (manager) => {
      const invitationRepository = manager.getRepository(Invitation);

      const userRepository = manager.getRepository(User);

      const invitation = await this.findValidInvitation(
        token,
        invitationRepository,
      );

      const invitationEmail = this.normalizeEmail(invitation.email);

      const googleEmail = this.normalizeEmail(googleUser.email);

      if (invitationEmail !== googleEmail) {
        throw authError(AuthErrorCode.GOOGLE_EMAIL_MISMATCH);
      }

      const existingUser = await userRepository.findOne({
        where: { email: invitationEmail },
      });

      if (existingUser) {
        throw authError(AuthErrorCode.ACCOUNT_EXISTS);
      }

      const existingGoogleUser = await userRepository.findOne({
        where: { googleId: googleUser.googleId },
      });

      if (existingGoogleUser) {
        throw authError(AuthErrorCode.GOOGLE_ACCOUNT_IN_USE);
      }

      const firstName = googleUser.firstName.trim();
      const lastName = googleUser.lastName.trim();

      // A Google profile may have no family name; the password form asks for one.
      if (!firstName || !lastName) {
        throw authError(AuthErrorCode.GOOGLE_NAME_MISSING);
      }

      const user = await this.usersService.createInvitedUser(
        {
          companyId: invitation.companyId,
          email: invitationEmail,
          role: invitation.role,
          firstName,
          lastName,
          googleId: googleUser.googleId,
        },
        manager,
      );

      await this.createInvitationMembership(invitation, user.id, manager);

      await this.acceptInvitation(invitation, user.id, manager);

      return user;
    });

    return this.sessionService.createSession(user, metadata);
  }

  /**
   * Every send gets a fresh link, so only the latest email works. The email
   * goes out before the save is committed, so a failed send changes nothing —
   * including the expired invitation it replaces, which stays listed.
   */
  private async saveWithNewLinkAndSend(
    invitation: Invitation,
    replaces?: Invitation | null,
  ): Promise<void> {
    const rawToken = randomBytes(32).toString('hex');

    invitation.tokenHash = this.hashToken(rawToken);
    invitation.expiresAt = new Date(Date.now() + INVITATION_VALID_MS);

    const frontendUrl =
      this.configService.getOrThrow<string>('app.frontendUrl');
    const inviteUrl = `${frontendUrl}/invitations/complete?token=${rawToken}`;

    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Invitation);

      if (replaces) {
        replaces.status = InvitationStatus.REVOKED;
        replaces.revokedAt = new Date();
        await repository.save(replaces);
      }

      const { id } = await repository.save(invitation);

      const saved = await repository.findOneOrFail({
        where: { id },
        relations: { company: true, invitedBy: true, team: true },
      });

      await this.mailService.sendInvitationEmail(saved.email, {
        inviteUrl,
        companyName: saved.company.companyName,
        inviterName: fullName(saved.invitedBy),
        roleDescription:
          saved.role === UserRole.MANAGER ? 'a manager' : 'an employee',
        teamName: saved.team?.name ?? null,
        leadsTeam: saved.role === UserRole.MANAGER,
        validDays: INVITATION_VALID_DAYS,
      });
    });
  }

  /** A manager gets the same answer for an invitation outside their teams as for a missing one. */
  private async findPendingInScope(
    id: string,
    user: AuthUser,
  ): Promise<Invitation> {
    const invitation = await this.invitationRepository.findOne({
      where: {
        id,
        companyId: user.companyId,
        status: InvitationStatus.PENDING,
      },
    });

    const visibleTeamIds = await this.teamVisibility.getVisibleTeamIds(user);

    const isInScope =
      !visibleTeamIds ||
      (invitation?.role === UserRole.EMPLOYEE &&
        invitation.teamId != null &&
        visibleTeamIds.includes(invitation.teamId));

    if (!invitation || !isInScope) {
      throw new NotFoundException('Invitation not found');
    }

    return invitation;
  }

  /**
   * Sending refuses an address that has an account, but the person may have
   * signed up since. Saying so when the link opens spares them a form that
   * can only fail; both completions still check inside their transaction.
   */
  private async findOpenableInvitation(token: string): Promise<Invitation> {
    const invitation = await this.findValidInvitation(
      token,
      this.invitationRepository,
    );

    const hasAccount = await this.dataSource
      .getRepository(User)
      .exists({ where: { email: this.normalizeEmail(invitation.email) } });

    if (hasAccount) {
      throw unusableInvitation(UnusableInvitationCode.ACCOUNT_EXISTS);
    }

    return invitation;
  }

  private async findValidInvitation(
    token: string,
    repository: Repository<Invitation>,
  ): Promise<Invitation> {
    const normalizedToken = token?.trim();

    if (!normalizedToken) {
      throw unusableInvitation(UnusableInvitationCode.NOT_FOUND);
    }

    const tokenHash = this.hashToken(normalizedToken);

    const invitation = await repository.findOne({
      where: { tokenHash },
      relations: { team: true, company: true, invitedBy: true },
    });

    if (!invitation) {
      throw unusableInvitation(UnusableInvitationCode.NOT_FOUND);
    }

    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw unusableInvitation(UnusableInvitationCode.ACCEPTED);
    }

    const inviterContext = {
      companyName: invitation.company.companyName,
      inviterName: fullName(invitation.invitedBy),
    };

    if (invitation.status === InvitationStatus.REVOKED) {
      throw unusableInvitation(UnusableInvitationCode.REVOKED, inviterContext);
    }

    if (invitation.expiresAt <= new Date()) {
      throw unusableInvitation(UnusableInvitationCode.EXPIRED, inviterContext);
    }

    return invitation;
  }

  /** Shared by both completion paths, so the inviter is told either way. */
  private async acceptInvitation(
    invitation: Invitation,
    joinedUserId: string,
    manager: EntityManager,
  ): Promise<void> {
    invitation.status = InvitationStatus.ACCEPTED;
    invitation.acceptedAt = new Date();

    await manager.getRepository(Invitation).save(invitation);

    await this.notificationsService.notifyInvitationAccepted(
      invitation,
      joinedUserId,
      manager,
    );
  }

  private async resolveInvitationTeamId(
    companyId: string,
    payload: CreateInvitationPayload,
    user: AuthUser,
  ): Promise<string | null> {
    const { teamId } = payload;

    if (payload.role === UserRole.MANAGER && !teamId) {
      return null;
    }

    if (!teamId) {
      throw new BadRequestException('An employee must be invited into a team');
    }

    const visibleTeamIds = await this.teamVisibility.getVisibleTeamIds(user);

    if (visibleTeamIds && !visibleTeamIds.includes(teamId)) {
      throw new ForbiddenException('You can only invite into teams you lead');
    }

    await findActiveTeam(
      this.teamRepository,
      teamId,
      companyId,
      'Cannot invite into an archived team',
    );

    return teamId;
  }

  /**
   * The team may have been archived while the invitation was waiting. Nobody's
   * signup should fail over that, so the person is created without a
   * membership and the owner places them.
   */
  private async createInvitationMembership(
    invitation: Invitation,
    userId: string,
    manager: EntityManager,
  ): Promise<void> {
    if (!invitation.teamId) {
      return;
    }

    const teamRepository = manager.getRepository(Team);

    const team = await teamRepository.findOne({
      where: { id: invitation.teamId, companyId: invitation.companyId },
      select: ['id', 'status'],
    });

    if (!team || team.status === TeamStatus.ARCHIVED) {
      return;
    }

    const membershipRepository = manager.getRepository(TeamMembership);

    const membership = membershipRepository.create({
      companyId: invitation.companyId,
      teamId: invitation.teamId,
      userId,
      roleInTeam:
        invitation.role === UserRole.MANAGER
          ? TeamRole.MANAGER
          : TeamRole.MEMBER,
      joinedAt: await findCompanyToday(manager, invitation.companyId),
      leftAt: null,
    });

    await membershipRepository.save(membership);
  }

  /**
   * Appointing a manager is how the Owner delegates, so it must not be
   * something a manager can do for themselves.
   */
  private validateInvitationRole(role: UserRole, callerRole: UserRole): void {
    const allowedRoles = [UserRole.MANAGER, UserRole.EMPLOYEE];

    if (!allowedRoles.includes(role)) {
      throw new BadRequestException(
        'Only MANAGER and EMPLOYEE roles can be assigned through an invitation',
      );
    }

    if (role === UserRole.MANAGER && callerRole !== UserRole.OWNER) {
      throw new ForbiddenException('Only an owner can invite a manager');
    }
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}

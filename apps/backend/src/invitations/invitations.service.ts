// apps/backend/src/invitations/invitations.service.ts

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
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

    if (existingInvitation) {
      if (existingInvitation.expiresAt > new Date()) {
        throw new ConflictException(
          'An active invitation already exists for this email',
        );
      }

      existingInvitation.status = InvitationStatus.REVOKED;
      existingInvitation.revokedAt = new Date();

      await this.invitationRepository.save(existingInvitation);
    }

    const invitation = this.invitationRepository.create({
      companyId,
      teamId,
      invitedById: user.id,
      email,
      role: payload.role,
      status: InvitationStatus.PENDING,
    });

    await this.saveWithNewLinkAndSend(invitation);
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
        ...(visibleTeamIds ? { teamId: In(visibleTeamIds) } : {}),
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

  /** What the invitation page shows before the person accepts. */
  async describeByToken(token: string) {
    const invitation = await this.findValidInvitation(
      token,
      this.invitationRepository,
    );

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

      const normalizedFirstName = firstName.trim();
      const normalizedLastName = lastName.trim();

      this.validateUserName(normalizedFirstName, normalizedLastName);

      const passwordHash = await this.passwordService.hash(password);

      const user = await this.usersService.createInvitedUser(
        {
          companyId: invitation.companyId,
          email,
          role: invitation.role,
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
          passwordHash,
        },
        manager,
      );

      await this.createInvitationMembership(invitation, user.id, manager);

      await this.acceptInvitation(invitation, invitationRepository);

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
        throw new UnauthorizedException(
          'Google account email does not match the invitation email',
        );
      }

      const existingUser = await userRepository.findOne({
        where: { email: invitationEmail },
      });

      if (existingUser) {
        throw new ConflictException('A user with this email already exists');
      }

      const existingGoogleUser = await userRepository.findOne({
        where: { googleId: googleUser.googleId },
      });

      if (existingGoogleUser) {
        throw new ConflictException(
          'This Google account is already associated with another user',
        );
      }

      const firstName = googleUser.firstName.trim();
      const lastName = googleUser.lastName.trim();

      this.validateUserName(firstName, lastName);

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

      await this.acceptInvitation(invitation, invitationRepository);

      return user;
    });

    return this.sessionService.createSession(user, metadata);
  }

  /**
   * Every send gets a fresh link, so only the latest email works. The email
   * goes out before the save is committed, so a failed send changes nothing.
   */
  private async saveWithNewLinkAndSend(invitation: Invitation): Promise<void> {
    const rawToken = randomBytes(32).toString('hex');

    invitation.tokenHash = this.hashToken(rawToken);
    invitation.expiresAt = new Date(Date.now() + INVITATION_VALID_MS);

    const frontendUrl =
      this.configService.getOrThrow<string>('app.frontendUrl');
    const inviteUrl = `${frontendUrl}/invitations/complete?token=${rawToken}`;

    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Invitation);
      const { id } = await repository.save(invitation);

      // The original sender stays the inviter when someone else resends it.
      const saved = await repository.findOneOrFail({
        where: { id },
        relations: { company: true, invitedBy: true, team: true },
      });

      await this.mailService.sendInvitationEmail(saved.email, {
        inviteUrl,
        companyName: saved.company.companyName,
        inviterName: fullName(saved.invitedBy),
        // Only managers and employees are ever invited.
        roleDescription:
          saved.role === UserRole.MANAGER ? 'a manager' : 'an employee',
        teamName: saved.team?.name ?? null,
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
      (invitation?.teamId != null &&
        visibleTeamIds.includes(invitation.teamId));

    if (!invitation || !isInScope) {
      throw new NotFoundException('Invitation not found');
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

  private async acceptInvitation(
    invitation: Invitation,
    repository: Repository<Invitation>,
  ): Promise<void> {
    invitation.status = InvitationStatus.ACCEPTED;
    invitation.acceptedAt = new Date();

    await repository.save(invitation);
  }

  /**
   * An employee always joins into a team, and a manager may only staff a team
   * they lead, so the invitation has to carry the team from the start.
   */
  private async resolveInvitationTeamId(
    companyId: string,
    payload: CreateInvitationPayload,
    user: AuthUser,
  ): Promise<string | null> {
    const { teamId } = payload;

    // Accepting always creates a plain member, so a manager invited into a
    // team would not lead it. The owner assigns them afterwards instead.
    if (payload.role !== UserRole.EMPLOYEE) {
      if (teamId) {
        throw new BadRequestException(
          'Only an employee can be invited into a team',
        );
      }

      return null;
    }

    if (!teamId) {
      throw new BadRequestException('An employee must be invited into a team');
    }

    // Checked before the team itself, so a manager gets the same answer for
    // any team they do not lead, whether it exists, is archived or not.
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
      // Never taken from the invitation: accepting must not become a second
      // route to a manager membership.
      roleInTeam: TeamRole.MEMBER,
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

  private validateUserName(firstName: string, lastName: string): void {
    if (!firstName || !lastName) {
      throw new BadRequestException('First name and last name are required');
    }
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}

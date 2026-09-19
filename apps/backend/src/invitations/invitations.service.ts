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
import { DataSource, EntityManager, MoreThan, Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';

import { UserRole } from 'src/users/enums/user-role.enum';
import { UsersService } from 'src/users/users.service';
import { MailService } from 'src/mail/mail.service';
import { SessionService } from 'src/auth/services/session.service';
import { PasswordService } from 'src/auth/services/password.service';
import { TeamVisibilityService } from 'src/teams/team-visibility.service';
import { Team } from 'src/teams/entities/team.entity';
import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { TeamRole } from 'src/teams/enums/team-role.enum';
import { TeamStatus } from 'src/teams/enums/team-status.enum';
import type { SessionMetadata } from 'src/lib/types/session-metadata';
import type { GoogleUserPayload } from 'src/auth/dtos/auth.dto';
import type { AuthUser } from 'src/auth/auth-strategies/types';

import { Invitation } from './entities/invitation.entity';
import { InvitationStatus } from './enums/invitation-status.enum';
import type { CreateInvitationPayload } from './dtos/create-invitation.dto';
import { User } from 'src/users/entities/user.entity';

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

      throw new ConflictException('A user with this email already exists');
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

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    const expiresAt = new Date(
      Date.now() +
        this.configService.getOrThrow<number>('auth.invitation.expiresInMs'),
    );

    const invitation = this.invitationRepository.create({
      companyId,
      teamId,
      invitedById: user.id,
      email,
      role: payload.role,
      status: InvitationStatus.PENDING,
      tokenHash,
      expiresAt,
    });

    await this.invitationRepository.save(invitation);

    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');

    const inviteUrl = `${frontendUrl}/invitations/complete?token=${rawToken}`;

    await this.mailService.sendInvitationEmail(email, inviteUrl);
  }

  async listPendingByCompany(companyId: string): Promise<Invitation[]> {
    return this.invitationRepository.find({
      where: {
        companyId,
        status: InvitationStatus.PENDING,
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findByToken(token: string): Promise<Invitation> {
    return this.findValidInvitation(token, this.invitationRepository);
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

  private async findValidInvitation(
    token: string,
    repository: Repository<Invitation>,
  ): Promise<Invitation> {
    const normalizedToken = token?.trim();

    if (!normalizedToken) {
      throw new BadRequestException('Invitation token is required');
    }

    const tokenHash = this.hashToken(normalizedToken);

    const invitation = await repository.findOne({
      where: { tokenHash },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Invitation is no longer valid');
    }

    if (invitation.expiresAt <= new Date()) {
      throw new BadRequestException('Invitation has expired');
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
   * A manager may only staff a team they lead, and only with someone new to
   * the company, so the invitation has to carry the team from the start.
   */
  private async resolveInvitationTeamId(
    companyId: string,
    payload: CreateInvitationPayload,
    user: AuthUser,
  ): Promise<string | null> {
    const { teamId } = payload;

    if (!teamId) {
      if (user.role === UserRole.OWNER) {
        return null;
      }

      throw new BadRequestException(
        'A team is required when a manager sends an invitation',
      );
    }

    // Accepting always creates a plain member, so a manager invited into a
    // team would not lead it. The owner assigns them afterwards instead.
    if (payload.role !== UserRole.EMPLOYEE) {
      throw new BadRequestException(
        'Only an employee can be invited into a team',
      );
    }

    // TODO: this lookup also exists in TeamsService.addMember. Move it onto
    // TeamsService as a public helper once a third caller needs it.
    const team = await this.teamRepository.findOne({
      where: { id: teamId, companyId },
      select: ['id', 'status'],
    });

    if (!team) {
      throw new NotFoundException(
        `Team with id ${teamId} not found in this company`,
      );
    }

    if (team.status === TeamStatus.ARCHIVED) {
      throw new BadRequestException('Cannot invite into an archived team');
    }

    const visibleTeamIds = await this.teamVisibility.getVisibleTeamIds(user);

    if (visibleTeamIds && !visibleTeamIds.includes(teamId)) {
      throw new ForbiddenException('You can only invite into teams you lead');
    }

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
      joinedAt: new Date().toISOString().slice(0, 10),
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

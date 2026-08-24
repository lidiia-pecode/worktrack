// apps/backend/src/invitations/invitations-service.ts

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';

import { UserRole } from 'src/users/enums/UserRole.enum';
import { UsersService } from 'src/users/users.service';
import { MailService } from 'src/mail/mail.service';
import { SessionService } from 'src/auth/services/session.service';
import { PasswordService } from 'src/auth/services/password.service';
import type { SessionMetadata } from 'src/lib/types/session-metadata';
import type { GoogleUserPayload } from 'src/auth/dtos/auth.dto';

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
  ) {}

  async create(
    companyId: string,
    payload: CreateInvitationPayload,
  ): Promise<void> {
    const email = this.normalizeEmail(payload.email);

    this.validateInvitationRole(payload.role);

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

  private validateInvitationRole(role: UserRole): void {
    const allowedRoles = [UserRole.MANAGER, UserRole.EMPLOYEE];

    if (!allowedRoles.includes(role)) {
      throw new BadRequestException(
        'Only MANAGER and EMPLOYEE roles can be assigned through an invitation',
      );
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

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { hashToken } from 'src/lib/utils/hash-token.util';
import { randomBytes } from 'crypto';
import { MailService } from 'src/mail/mail.service';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class PasswordResetService {
  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly repo: Repository<PasswordResetToken>,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly usersService: UsersService,
  ) {}

  async createToken(userId: string): Promise<string> {
    await this.repo.delete({
      userId,
    });

    const token = randomBytes(32).toString('base64url');
    const tokenHash = hashToken(token);

    const expiresInMs = this.configService.getOrThrow<number>(
      'auth.passwordReset.expiresInMs',
    );

    const resetToken = this.repo.create({
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + expiresInMs),
    });

    await this.repo.save(resetToken);

    return token;
  }

  async consumeToken(
    token: string,
    manager: EntityManager,
  ): Promise<PasswordResetToken> {
    const tokenHash = hashToken(token);

    const resetToken = await manager
      .getRepository(PasswordResetToken)
      .createQueryBuilder('resetToken')
      .setLock('pessimistic_write')
      .where('resetToken.tokenHash = :tokenHash', { tokenHash })
      .getOne();

    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    resetToken.usedAt = new Date();

    await manager.getRepository(PasswordResetToken).save(resetToken);

    return resetToken;
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.usersService.findByEmailWithCompany(email);

    if (!user) {
      return;
    }

    const token = await this.createToken(user.id);

    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');

    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

    await this.mailService.sendPasswordResetEmail(user.email, resetUrl);
  }
}

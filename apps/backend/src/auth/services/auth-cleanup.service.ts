import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource, EntityTarget, ObjectLiteral } from 'typeorm';

import { GoogleLinkToken } from '../entities/google-link-token.entity';
import { GoogleSignupToken } from '../entities/google-signup-token.entity';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { SessionService } from './session.service';

@Injectable()
export class AuthCleanupService {
  private readonly logger = new Logger(AuthCleanupService.name);

  constructor(
    private readonly sessionService: SessionService,
    private readonly dataSource: DataSource,
  ) {}

  @Cron('0 0 3 * * *')
  async handleCron(): Promise<void> {
    const sessions = await this.sessionService.deleteExpiredSessions();
    const signupTokens = await this.deleteUsedOrExpired(GoogleSignupToken);
    const linkTokens = await this.deleteUsedOrExpired(GoogleLinkToken);
    const resetTokens = await this.deleteUsedOrExpired(PasswordResetToken);

    this.logger.log(
      `Deleted ${sessions} expired sessions, ${signupTokens} Google sign-up tokens, ` +
        `${linkTokens} Google link tokens and ${resetTokens} password-reset tokens.`,
    );
  }

  private async deleteUsedOrExpired(
    entity: EntityTarget<ObjectLiteral>,
  ): Promise<number> {
    const result = await this.dataSource
      .createQueryBuilder()
      .delete()
      .from(entity)
      .where('used_at IS NOT NULL')
      .orWhere('expires_at < :now', { now: new Date() })
      .execute();

    return result.affected ?? 0;
  }
}

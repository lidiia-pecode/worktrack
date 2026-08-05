// apps/backend/src/auth/services/session-cleanup.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SessionService } from './session.service';

@Injectable()
export class SessionCleanupService {
  private readonly logger = new Logger(SessionCleanupService.name);

  constructor(private readonly sessionService: SessionService) {}

  @Cron('0 0 3 * * *')
  async handleCron() {
    this.logger.log('Starting cleanup of expired auth sessions...');
    const deletedCount = await this.sessionService.deleteExpiredSessions();
    this.logger.log(`Cleaned up ${deletedCount} expired auth sessions.`);
  }
}

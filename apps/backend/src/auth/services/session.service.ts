import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, LessThan, Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { AuthSession } from '../entities/auth-session.entity';
import { SessionMetadata } from 'src/lib/types/session-metadata';
import { AuthUser } from '../auth-strategies/types';

import { TokenService } from './token.service';

// The sizes of the ip and user_agent columns in auth_sessions. Both come from
// the request as sent, so a longer value would fail the sign-in or refresh.
const IP_MAX_LENGTH = 45;
const USER_AGENT_MAX_LENGTH = 500;

@Injectable()
export class SessionService {
  constructor(
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService,

    @InjectRepository(AuthSession)
    private readonly repo: Repository<AuthSession>,
  ) {}

  public getSessionExpirationDate(): Date {
    const maxAgeMs = this.configService.getOrThrow<number>(
      'auth.refreshToken.maxAgeMs',
    );

    return new Date(Date.now() + maxAgeMs);
  }

  async findById(id: string): Promise<AuthSession | null> {
    return this.repo.findOne({
      where: { id },
    });
  }

  async exists(id: string): Promise<boolean> {
    return this.repo.exists({
      where: { id },
    });
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async deleteAllForUser(
    userId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const activeManager = manager || this.repo.manager;

    await activeManager.getRepository(AuthSession).delete({ userId });
  }

  async deleteAllForUserExcept(
    userId: string,
    sessionId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const activeManager = manager || this.repo.manager;

    await activeManager
      .createQueryBuilder(AuthSession, 'session')
      .delete()
      .where('"user_id" = :userId', { userId })
      .andWhere('"id" != :sessionId', { sessionId })
      .execute();
  }

  /**
   * Atomic rotation: update the hash ONLY if the expectedOldHash is in the database.
   */
  async rotateRefreshHash(
    sessionId: string,
    expectedOldHash: string,
    newHash: string,
    newExpiresAt: Date,
    metadata?: { ip?: string; userAgent?: string },
  ): Promise<boolean> {
    const updateData: Partial<AuthSession> = {
      refreshHash: newHash,
      previousRefreshHash: expectedOldHash,
      rotatedAt: new Date(),
      expiresAt: newExpiresAt,
      lastActivityAt: new Date(),
    };

    if (metadata?.ip) updateData.ip = metadata.ip.slice(0, IP_MAX_LENGTH);
    if (metadata?.userAgent) {
      updateData.userAgent = metadata.userAgent.slice(0, USER_AGENT_MAX_LENGTH);
    }

    const result = await this.repo.update(
      {
        id: sessionId,
        refreshHash: expectedOldHash,
      },
      updateData,
    );

    return (result.affected ?? 0) > 0;
  }

  async deleteExpiredSessions(): Promise<number> {
    const result = await this.repo.delete({
      expiresAt: LessThan(new Date()),
    });

    return result.affected ?? 0;
  }

  async createSession(
    user: AuthUser,
    metadata?: SessionMetadata,
    manager?: EntityManager,
  ) {
    const expiresAt = this.getSessionExpirationDate();
    const sessionId = randomUUID();

    const accessToken = this.tokenService.createAccessToken({
      id: user.id,
      email: user.email,
      companyId: user.companyId,
      role: user.role,
      sessionId,
    });

    const refreshToken = this.tokenService.createRefreshToken({
      id: user.id,
      companyId: user.companyId,
      sessionId,
    });

    const refreshHash = this.tokenService.hashRefreshToken(
      refreshToken,
      sessionId,
    );

    const activeManager = manager ?? this.repo.manager;

    await activeManager.getRepository(AuthSession).save({
      id: sessionId,
      userId: user.id,
      companyId: user.companyId,
      refreshHash,
      expiresAt,
      ip: metadata?.ip?.slice(0, IP_MAX_LENGTH) ?? '0.0.0.0',
      userAgent:
        metadata?.userAgent?.slice(0, USER_AGENT_MAX_LENGTH) ?? 'unknown',
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }
}

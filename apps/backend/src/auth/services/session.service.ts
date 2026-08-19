import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, LessThan, Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { AuthSession } from '../entities/auth-session.entity';
import { CreateSessionDto } from '../dtos/create-session.dto';
import { SessionMetadata } from 'src/lib/types/session-metadata';
import { AuthUser } from '../auth-strategies/types';

import { TokenService } from './token.service';

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

  async create(payload: CreateSessionDto): Promise<AuthSession> {
    const session = this.repo.create(payload);
    return this.repo.save(session);
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

    if (metadata?.ip) updateData.ip = metadata.ip;
    if (metadata?.userAgent) updateData.userAgent = metadata.userAgent;

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
      ip: metadata?.ip ?? '0.0.0.0',
      userAgent: metadata?.userAgent ?? 'unknown',
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }
}

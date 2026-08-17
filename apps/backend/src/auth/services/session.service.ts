import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { CreateSessionDto } from '../dtos/create-session.dto';
import { AuthSession } from '../entities/auth-session.entity';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(AuthSession)
    private readonly repo: Repository<AuthSession>,
  ) {}

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

  async deleteAllForUser(userId: string): Promise<void> {
    await this.repo.delete({ userId });
  }

  async deleteAllForUserExcept(
    userId: string,
    sessionId: string,
  ): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .delete()
      .from(AuthSession)
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
}

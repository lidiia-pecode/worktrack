import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, IsNull, LessThan, Repository } from 'typeorm';

import type { AuthUser } from 'src/auth/auth-strategies/types';
import { MS_PER_DAY } from 'src/lib/consts';
import type { Invitation } from 'src/invitations/entities/invitation.entity';
import { User } from 'src/users/entities/user.entity';
import { UserRole, UserStatus } from 'src/users/enums/user-role.enum';
import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { TeamRole } from 'src/teams/enums/team-role.enum';

import {
  Notification,
  PlansRemovedDetails,
} from './entities/notification.entity';
import { LATEST_NOTIFICATIONS } from './notification.constants';
import { NotificationType } from './enums/notification-type.enum';

const READ_RETENTION_DAYS = 60;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  /**
   * Tells whoever answers for the new person that they joined, in the same
   * transaction as the acceptance: the owner who invited them, otherwise the
   * team's current manager, who is the inviter while they still lead it. Only
   * an active person is told, so nobody when the team has no active manager.
   */
  async notifyInvitationAccepted(
    invitation: Invitation,
    joinedUserId: string,
    manager: EntityManager,
  ): Promise<void> {
    const recipientId = await this.joinedNoticeRecipient(invitation, manager);
    if (!recipientId) return;

    await manager.getRepository(Notification).save({
      companyId: invitation.companyId,
      recipientId,
      type: NotificationType.INVITATION_ACCEPTED,
      subjectUserId: joinedUserId,
      readAt: null,
    });
  }

  private async joinedNoticeRecipient(
    { companyId, invitedById, teamId }: Invitation,
    manager: EntityManager,
  ): Promise<string | null> {
    const inviter = invitedById
      ? await manager.getRepository(User).findOne({
          select: ['id', 'role', 'status'],
          where: { id: invitedById, companyId },
        })
      : null;

    if (inviter?.role === UserRole.OWNER) {
      return inviter.status === UserStatus.ACTIVE ? inviter.id : null;
    }
    if (!teamId) return null;

    const teamManager = await manager.getRepository(TeamMembership).findOne({
      select: ['id', 'userId'],
      where: {
        companyId,
        teamId,
        roleInTeam: TeamRole.MANAGER,
        leftAt: IsNull(),
        user: { status: UserStatus.ACTIVE },
      },
    });

    return teamManager?.userId ?? null;
  }

  /**
   * Tells whoever planned them that an absence removed some plans, in the
   * absence's transaction. The caller decides who is told, and about which
   * days.
   */
  async notifyPlansRemoved(
    manager: EntityManager,
    notice: {
      companyId: string;
      recipientId: string;
      subjectUserId: string;
      details: PlansRemovedDetails;
    },
  ): Promise<void> {
    await manager.getRepository(Notification).save({
      ...notice,
      type: NotificationType.PLANS_REMOVED_BY_ABSENCE,
      readAt: null,
    });
  }

  /**
   * The caller's own notifications, unread first so none is hidden behind
   * read ones, each group newest first.
   */
  async listForUser(user: AuthUser) {
    const [items, unreadCount] = await Promise.all([
      this.notificationRepository
        .createQueryBuilder('notification')
        .leftJoinAndSelect('notification.subjectUser', 'subjectUser')
        .addSelect('notification.read_at IS NULL', 'is_unread')
        .where('notification.recipient_id = :recipientId', {
          recipientId: user.id,
        })
        .andWhere('notification.company_id = :companyId', {
          companyId: user.companyId,
        })
        .orderBy('is_unread', 'DESC')
        .addOrderBy('notification.created_at', 'DESC')
        .addOrderBy('notification.id')
        .limit(LATEST_NOTIFICATIONS)
        .getMany(),
      this.unreadCountFor(user),
    ]);

    return { items, unreadCount };
  }

  /**
   * Only the ones the menu showed, so one that arrived since stays unread.
   * Returns how many are still unread, for the badge.
   */
  async markRead(user: AuthUser, ids: string[]): Promise<number> {
    await this.notificationRepository.update(
      {
        id: In(ids),
        recipientId: user.id,
        companyId: user.companyId,
        readAt: IsNull(),
      },
      { readAt: new Date() },
    );

    return this.unreadCountFor(user);
  }

  private unreadCountFor(user: AuthUser): Promise<number> {
    return this.notificationRepository.count({
      where: {
        recipientId: user.id,
        companyId: user.companyId,
        readAt: IsNull(),
      },
    });
  }

  @Cron('0 0 3 * * *')
  async deleteOldReadNotifications(): Promise<void> {
    const readBefore = new Date(Date.now() - READ_RETENTION_DAYS * MS_PER_DAY);

    const { affected } = await this.notificationRepository.delete({
      readAt: LessThan(readBefore),
    });

    this.logger.log(`Deleted ${affected ?? 0} old read notifications.`);
  }
}

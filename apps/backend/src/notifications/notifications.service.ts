import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, IsNull, LessThan, Repository } from 'typeorm';

import type { AuthUser } from 'src/auth/auth-strategies/types';
import type { Invitation } from 'src/invitations/entities/invitation.entity';
import { User } from 'src/users/entities/user.entity';
import { UserStatus } from 'src/users/enums/user-role.enum';

import { Notification } from './entities/notification.entity';
import { LATEST_NOTIFICATIONS } from './notification.constants';
import { NotificationType } from './enums/notification-type.enum';

const READ_RETENTION_DAYS = 60;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  /**
   * Tells whoever sent the invitation that the person joined, in the same
   * transaction as the acceptance. Nobody is told when the sender no longer
   * exists or has been archived.
   */
  async notifyInvitationAccepted(
    invitation: Invitation,
    joinedUserId: string,
    manager: EntityManager,
  ): Promise<void> {
    if (!invitation.invitedById) return;

    const inviterIsActive = await manager.getRepository(User).exists({
      where: {
        id: invitation.invitedById,
        companyId: invitation.companyId,
        status: UserStatus.ACTIVE,
      },
    });

    if (!inviterIsActive) return;

    await manager.getRepository(Notification).save({
      companyId: invitation.companyId,
      recipientId: invitation.invitedById,
      type: NotificationType.INVITATION_ACCEPTED,
      subjectUserId: joinedUserId,
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

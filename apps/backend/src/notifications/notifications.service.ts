import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';

import type { AuthUser } from 'src/auth/auth-strategies/types';
import type { Invitation } from 'src/invitations/entities/invitation.entity';
import { User } from 'src/users/entities/user.entity';
import { UserStatus } from 'src/users/enums/user-role.enum';

import { Notification } from './entities/notification.entity';
import { NotificationType } from './enums/notification-type.enum';

/** A short list is all the menu shows; older ones are not paged. */
const LATEST_NOTIFICATIONS = 20;

@Injectable()
export class NotificationsService {
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

  /** The caller's own notifications only, newest first. */
  async listForUser(user: AuthUser) {
    const where = { recipientId: user.id, companyId: user.companyId };

    const [items, unreadCount] = await Promise.all([
      this.notificationRepository.find({
        where,
        relations: { subjectUser: true },
        order: { createdAt: 'DESC' },
        take: LATEST_NOTIFICATIONS,
      }),
      this.notificationRepository.count({
        where: { ...where, readAt: IsNull() },
      }),
    ]);

    return { items, unreadCount };
  }

  async markAllRead(user: AuthUser): Promise<void> {
    await this.notificationRepository.update(
      { recipientId: user.id, companyId: user.companyId, readAt: IsNull() },
      { readAt: new Date() },
    );
  }
}

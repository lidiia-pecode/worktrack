import { Body, Controller, Get, Post } from '@nestjs/common';

import type { AuthUser } from 'src/auth/auth-strategies/types';
import { CurrentUser } from 'src/lib/decorators';
import { Serialize } from 'src/lib/interceptors';

import { MarkReadPayload } from './dtos/mark-read-payload.dto';
import { NotificationListResponse } from './dtos/notification-response.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Serialize(NotificationListResponse)
  list(@CurrentUser() user: AuthUser) {
    return this.notificationsService.listForUser(user);
  }

  @Post('read')
  async markRead(@CurrentUser() user: AuthUser, @Body() body: MarkReadPayload) {
    const unreadCount = await this.notificationsService.markRead(
      user,
      body.ids,
    );

    return { unreadCount };
  }
}

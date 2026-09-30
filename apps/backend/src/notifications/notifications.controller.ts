import { Controller, Get, Post, UseGuards } from '@nestjs/common';

import { AccessGuard } from 'src/auth/guards';
import type { AuthUser } from 'src/auth/auth-strategies/types';
import { CurrentUser } from 'src/lib/decorators';
import { Serialize } from 'src/lib/interceptors';

import { NotificationListResponse } from './dtos/notification-response.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(AccessGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Serialize(NotificationListResponse)
  list(@CurrentUser() user: AuthUser) {
    return this.notificationsService.listForUser(user);
  }

  @Post('read')
  async markAllRead(@CurrentUser() user: AuthUser) {
    await this.notificationsService.markAllRead(user);

    return { success: true };
  }
}

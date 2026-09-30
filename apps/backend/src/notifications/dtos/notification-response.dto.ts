import { Exclude, Expose, Type } from 'class-transformer';

import { NotificationType } from '../enums/notification-type.enum';

@Exclude()
export class NotificationSubjectResponse {
  @Expose()
  id!: string;

  @Expose()
  firstName!: string;

  @Expose()
  lastName!: string;
}

@Exclude()
export class NotificationResponse {
  @Expose()
  id!: string;

  @Expose()
  type!: NotificationType;

  @Expose()
  @Type(() => NotificationSubjectResponse)
  subjectUser!: NotificationSubjectResponse | null;

  @Expose()
  readAt!: Date | null;

  @Expose()
  createdAt!: Date;
}

@Exclude()
export class NotificationListResponse {
  @Expose()
  @Type(() => NotificationResponse)
  items!: NotificationResponse[];

  @Expose()
  unreadCount!: number;
}

import { NotificationType } from "./enums";

export interface AppNotification {
  id: string;
  type: NotificationType;
  subjectUser: { id: string; firstName: string; lastName: string } | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationList {
  items: AppNotification[];
  unreadCount: number;
}

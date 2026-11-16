import { NotificationType } from "./enums";

/** The plans an absence removed, on the days the recipient can read. */
export interface PlansRemovedDetails {
  from: string;
  to: string;
  planCount: number;
  projects: { name: string; minutes: number }[];
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  subjectUser: { id: string; firstName: string; lastName: string } | null;
  details: PlansRemovedDetails | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationList {
  items: AppNotification[];
  unreadCount: number;
}

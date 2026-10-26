import { NotificationList } from "@/types/Notification";

import { createClient } from "../core";

const client = createClient({
  endpoint: "notifications",
});

export const NotificationsClientApi = {
  list: () => client.get<NotificationList>(""),

  markRead: (ids: string[]) =>
    client.post<Pick<NotificationList, "unreadCount">>("/read", { ids }),
};

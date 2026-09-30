import { NotificationList } from "@/types/Notification";

import { createClient } from "../core";

const client = createClient({
  endpoint: "notifications",
});

export const NotificationsClientApi = {
  list: () => client.get<NotificationList>(""),

  markAllRead: () => client.post("/read"),
};

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  useMarkNotificationsRead,
  useNotifications,
} from "@/hooks/useNotifications";
import { NotificationType } from "@/types/enums";
import type { AppNotification } from "@/types/Notification";

import { NotificationsDialog } from "./NotificationsDialog";

vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: vi.fn(),
  useMarkNotificationsRead: vi.fn(),
}));

const markRead = vi.fn();
const refetch = vi.fn();

const joined = (
  id: string,
  readAt: string | null,
  type = NotificationType.INVITATION_ACCEPTED,
): AppNotification => ({
  id,
  type,
  subjectUser: { id: `${id}-user`, firstName: "Ethan", lastName: "Brooks" },
  readAt,
  createdAt: "2026-10-20T09:00:00Z",
});

const showDialog = (items: AppNotification[], { markedSome = false } = {}) => {
  vi.mocked(useNotifications).mockReturnValue({
    data: {
      items,
      unreadCount: items.filter((item) => !item.readAt).length,
    },
    isError: false,
    isPending: false,
    refetch,
  } as unknown as ReturnType<typeof useNotifications>);
  vi.mocked(useMarkNotificationsRead).mockReturnValue({
    mutate: markRead,
    isIdle: !markedSome,
    reset: vi.fn(),
  } as unknown as ReturnType<typeof useMarkNotificationsRead>);

  const onClose = vi.fn();
  render(<NotificationsDialog open onClose={onClose} />);
  return { onClose };
};

describe("NotificationsDialog", () => {
  beforeEach(() => {
    markRead.mockReset();
    refetch.mockReset();
  });

  it("marks read only the unread ones it shows", () => {
    showDialog([joined("new", null), joined("seen", "2026-10-21T09:00:00Z")]);

    expect(markRead).toHaveBeenCalledExactlyOnceWith(["new"]);
  });

  it("marks nothing when everything shown is read", () => {
    showDialog([joined("seen", "2026-10-21T09:00:00Z")]);

    expect(markRead).not.toHaveBeenCalled();
  });

  it("shows a notification of another kind with a plain line", () => {
    showDialog([joined("other", null, "SOMETHING_NEW" as NotificationType)]);

    expect(
      screen.getByText("You have a new notification."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Put them on a project" }),
    ).not.toBeInTheDocument();
  });

  it("reloads the list on closing once it has marked some read", async () => {
    const { onClose } = showDialog([joined("new", null)], {
      markedSome: true,
    });

    await userEvent.click(
      screen.getByRole("link", { name: "Put them on a project" }),
    );

    expect(onClose).toHaveBeenCalled();
    expect(refetch).toHaveBeenCalled();
  });
});

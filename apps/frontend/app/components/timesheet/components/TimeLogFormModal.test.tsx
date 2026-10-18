import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TimeLog } from "@/types";
import { ActivityStatus } from "@/types/enums";

import { TimeLogFormModal } from "./TimeLogFormModal";

// An entry on a project that is archived, so it is not among the person's
// loggable project/activity pairs any more.
const archivedEntry: TimeLog = {
  id: "log-1",
  userId: "user-1",
  isBillable: true,
  minutes: 300,
  note: "UI design review",
  date: "2026-10-12",
  createdAt: "2026-10-12T09:00:00Z",
  updatedAt: "2026-10-12T09:00:00Z",
  projectActivity: {
    id: "pair-1",
    companyId: "company-1",
    projectId: "project-1",
    activityId: "activity-1",
    isActive: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    project: {
      id: "project-1",
      name: "Mobile App",
      clientName: "Retail Corp",
      status: "ARCHIVED",
    },
    activity: {
      id: "activity-1",
      companyId: "company-1",
      name: "UI Design",
      defaultBillable: true,
      status: ActivityStatus.ACTIVE,
      category: null,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  },
};

const renderForm = () => {
  const onUpdate = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();

  render(
    <TimeLogFormModal
      open
      onClose={onClose}
      date={archivedEntry.date}
      timelog={archivedEntry}
      pickerItems={[]}
      onCreate={vi.fn()}
      onUpdate={onUpdate}
      onDelete={vi.fn()}
      isSaving={false}
      isDeleting={false}
    />,
  );

  return { onUpdate, onClose };
};

describe("TimeLogFormModal", () => {
  it("saves an entry on an archived project without moving it, and clears its note", async () => {
    const user = userEvent.setup();
    const { onUpdate } = renderForm();

    await user.clear(await screen.findByRole("textbox", { name: "Note" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onUpdate).toHaveBeenCalledWith("log-1", {
      minutes: 300,
      isBillable: true,
      note: null,
    });
  });

  it("refuses a note shorter than three characters", async () => {
    const user = userEvent.setup();
    const { onUpdate } = renderForm();

    const note = await screen.findByRole("textbox", { name: "Note" });
    await user.clear(note);
    await user.type(note, "ok");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      await screen.findByText("Use at least 3 characters, or leave it empty"),
    ).toBeInTheDocument();
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("closes an untouched entry on Escape without asking", async () => {
    const user = userEvent.setup();
    const { onClose } = renderForm();

    await screen.findByRole("textbox", { name: "Note" });
    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole("dialog", { name: "Discard your changes?" }),
    ).not.toBeInTheDocument();
  });
});

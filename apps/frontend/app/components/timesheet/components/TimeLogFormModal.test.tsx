import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PickerProjectActivity } from "@/hooks/useAssignableActivities";
import { TimeLog } from "@/types";
import { ActivityStatus } from "@/types/enums";

import { lastEntryChoiceKey } from "../helpers/last-entry-choice";
import { TimeLogFormModal } from "./TimeLogFormModal";

const REMEMBER_KEY = lastEntryChoiceKey("viewer-1", "user-1");

const pickerItem = (
  overrides: Partial<PickerProjectActivity>,
): PickerProjectActivity => ({
  id: "pair-website-design",
  projectId: "project-website",
  projectName: "Website",
  activityId: "activity-design",
  activityName: "Design",
  defaultBillable: true,
  ...overrides,
});

const websiteDesign = pickerItem({});
const websiteMeetings = pickerItem({
  id: "pair-website-meetings",
  activityId: "activity-meetings",
  activityName: "Meetings",
  defaultBillable: false,
});
const intranetSupport = pickerItem({
  id: "pair-intranet-support",
  projectId: "project-intranet",
  projectName: "Intranet",
  activityId: "activity-support",
  activityName: "Support",
  defaultBillable: false,
});

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
      rememberKey={REMEMBER_KEY}
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

const renderNewEntry = (
  pickerItems: PickerProjectActivity[],
  plannedProjectId?: string,
) => {
  const onCreate = vi.fn().mockResolvedValue(undefined);

  const form = (items: PickerProjectActivity[]) => (
    <TimeLogFormModal
      open
      onClose={vi.fn()}
      date="2026-10-14"
      rememberKey={REMEMBER_KEY}
      plannedProjectId={plannedProjectId}
      pickerItems={items}
      onCreate={onCreate}
      onUpdate={vi.fn()}
      onDelete={vi.fn()}
      isSaving={false}
      isDeleting={false}
    />
  );

  const { rerender } = render(form(pickerItems));

  return {
    onCreate,
    rerenderWith: (items: PickerProjectActivity[]) => rerender(form(items)),
  };
};

const select = (name: string) => screen.findByRole("combobox", { name });
const billable = () => screen.getByRole("switch", { name: "Billable" });

beforeEach(() => window.localStorage.clear());

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

  describe("a new entry", () => {
    const items = [websiteDesign, websiteMeetings, intranetSupport];

    it("starts from the last project and activity logged for the person", async () => {
      window.localStorage.setItem(
        REMEMBER_KEY,
        JSON.stringify({
          projectId: "project-website",
          activityId: "activity-meetings",
        }),
      );
      renderNewEntry(items);

      expect(await select("Project")).toHaveTextContent("Website");
      expect(await select("Activity")).toHaveTextContent("Meetings");
      expect(billable()).not.toBeChecked();
      expect(billable()).toBeEnabled();
      await waitFor(() =>
        expect(screen.getByRole("spinbutton", { name: "Hours" })).toHaveFocus(),
      );
    });

    it("remembers the project and activity it logged", async () => {
      const user = userEvent.setup();
      const { onCreate } = renderNewEntry(items);

      await user.click(await select("Project"));
      await user.click(await screen.findByRole("option", { name: "Intranet" }));
      const hours = screen.getByRole("spinbutton", { name: "Hours" });
      await user.clear(hours);
      await user.type(hours, "1");
      await user.click(screen.getByRole("button", { name: "Log time" }));

      await waitFor(() => expect(onCreate).toHaveBeenCalledOnce());
      expect(onCreate).toHaveBeenCalledWith(
        expect.objectContaining({ projectActivityId: "pair-intranet-support" }),
      );
      expect(JSON.parse(window.localStorage.getItem(REMEMBER_KEY)!)).toEqual({
        projectId: "project-intranet",
        activityId: "activity-support",
      });
    });

    describe("opened from a plan", () => {
      beforeEach(() =>
        window.localStorage.setItem(
          REMEMBER_KEY,
          JSON.stringify({
            projectId: "project-website",
            activityId: "activity-meetings",
          }),
        ),
      );

      it("starts on the plan's project, with its only activity", async () => {
        renderNewEntry(items, "project-intranet");

        expect(await select("Project")).toHaveTextContent("Intranet");
        expect(await select("Activity")).toHaveTextContent("Support");
      });

      it("keeps the activity last logged when it is on the plan's project", async () => {
        renderNewEntry(items, "project-website");

        expect(await select("Project")).toHaveTextContent("Website");
        expect(await select("Activity")).toHaveTextContent("Meetings");
      });

      it("starts on no project when the person has left the planned one", async () => {
        renderNewEntry(items, "project-left");

        expect(await select("Project")).toHaveTextContent("Select project");
      });
    });

    it("ignores a remembered pair the person can no longer log against", async () => {
      window.localStorage.setItem(
        REMEMBER_KEY,
        JSON.stringify({
          projectId: "project-archived",
          activityId: "activity-design",
        }),
      );
      renderNewEntry(items);

      expect(await select("Project")).toHaveTextContent("Select project");
    });

    it("saves from the note with Ctrl+Enter", async () => {
      const user = userEvent.setup();
      const { onCreate } = renderNewEntry([websiteDesign]);

      const hours = screen.getByRole("spinbutton", { name: "Hours" });
      await user.clear(hours);
      await user.type(hours, "1");
      await user.click(screen.getByRole("textbox", { name: "Note" }));
      await user.keyboard("Wireframes{Control>}{Enter}{/Control}");

      await waitFor(() => expect(onCreate).toHaveBeenCalledOnce());
      expect(onCreate).toHaveBeenCalledWith(
        expect.objectContaining({ minutes: 60, note: "Wireframes" }),
      );
    });

    it("saves once when Ctrl+Enter is pressed again during the save", async () => {
      const user = userEvent.setup();
      const { onCreate } = renderNewEntry([websiteDesign]);
      onCreate.mockReturnValue(new Promise(() => {}));

      const hours = screen.getByRole("spinbutton", { name: "Hours" });
      await user.clear(hours);
      await user.type(hours, "1");
      await user.click(screen.getByRole("textbox", { name: "Note" }));
      await user.keyboard("{Control>}{Enter}{/Control}");
      await waitFor(() => expect(onCreate).toHaveBeenCalledOnce());
      await user.keyboard("{Control>}{Enter}{/Control}");

      expect(onCreate).toHaveBeenCalledOnce();
    });

    it("keeps what is typed when the picker refetches", async () => {
      const user = userEvent.setup();
      const { rerenderWith } = renderNewEntry([websiteDesign]);

      const note = screen.getByRole("textbox", { name: "Note" });
      await user.type(note, "Wireframes");
      rerenderWith([websiteDesign, intranetSupport]);

      expect(note).toHaveValue("Wireframes");
    });

    it("clears the duration error once the duration is fixed", async () => {
      const user = userEvent.setup();
      renderNewEntry([websiteDesign]);

      await user.click(screen.getByRole("button", { name: "Log time" }));
      expect(
        await screen.findByText("Enter a duration greater than 0"),
      ).toBeInTheDocument();

      await user.click(
        screen.getByRole("button", { name: "Increase: Minutes" }),
      );
      await waitFor(() =>
        expect(
          screen.queryByText("Enter a duration greater than 0"),
        ).not.toBeInTheDocument(),
      );
    });

    it("picks the only project and its only activity", async () => {
      renderNewEntry([websiteDesign]);

      expect(await select("Project")).toHaveTextContent("Website");
      expect(await select("Activity")).toHaveTextContent("Design");
      expect(billable()).toBeChecked();
    });

    it("keeps Billable off until an activity is picked", async () => {
      const user = userEvent.setup();
      renderNewEntry(items);

      expect(await select("Project")).toHaveTextContent("Select project");
      expect(billable()).not.toBeChecked();
      expect(billable()).toBeDisabled();

      await user.click(await select("Project"));
      await user.click(await screen.findByRole("option", { name: "Website" }));
      expect(billable()).toBeDisabled();

      await user.click(await select("Activity"));
      await user.click(await screen.findByRole("option", { name: "Design" }));
      expect(billable()).toBeChecked();
      expect(billable()).toBeEnabled();
    });

    it("takes Billable from the new project when the activity stays", async () => {
      const user = userEvent.setup();
      window.localStorage.setItem(
        REMEMBER_KEY,
        JSON.stringify({
          projectId: "project-website",
          activityId: "activity-design",
        }),
      );
      renderNewEntry([
        websiteDesign,
        pickerItem({
          id: "pair-intranet-design",
          projectId: "project-intranet",
          projectName: "Intranet",
          defaultBillable: false,
        }),
      ]);

      expect(billable()).toBeChecked();

      await user.click(await select("Project"));
      await user.click(await screen.findByRole("option", { name: "Intranet" }));

      expect(await select("Activity")).toHaveTextContent("Design");
      expect(billable()).not.toBeChecked();
    });

    it("turns Billable off again when a new project clears the activity", async () => {
      const user = userEvent.setup();
      window.localStorage.setItem(
        REMEMBER_KEY,
        JSON.stringify({
          projectId: "project-intranet",
          activityId: "activity-support",
        }),
      );
      renderNewEntry([
        websiteDesign,
        websiteMeetings,
        { ...intranetSupport, defaultBillable: true },
      ]);

      expect(await select("Activity")).toHaveTextContent("Support");
      expect(billable()).toBeChecked();

      await user.click(await select("Project"));
      await user.click(await screen.findByRole("option", { name: "Website" }));

      expect(await select("Activity")).toHaveTextContent("Select activity");
      expect(billable()).not.toBeChecked();
      expect(billable()).toBeDisabled();
    });
  });
});

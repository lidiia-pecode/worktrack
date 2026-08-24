"use client";

import { useState } from "react";
import { ArrowLeft, FolderKanban, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useProjects } from "@/hooks/useProjects";
import { useUsers } from "@/hooks/useUsers";
import { useActivities } from "@/hooks/useActivities";

import { ProjectStatus, UserRole } from "@/types/enums";

import { fullName, initials } from "@/lib/utils/user";
import { toggleSelection } from "@/lib/utils/toggle-selection";

import { ResourceFormModal } from "../shared/resourse/ResourceFormModal";
import { EntityPicker } from "../shared/resourse/EntityPicker";

import { ProjectForm, ProjectFormData } from "./ProjectForm";

interface CreateProjectModalProps {
  open?: boolean;
  onClose?: () => void;
}

type View = "form" | "members" | "activities";

export function CreateProjectModal({
  open: controlledOpen,
  onClose: controlledOnClose,
}: CreateProjectModalProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);

  const [view, setView] = useState<View>("form");

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>([]);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const {
    actions: { create },
  } = useProjects();

  const { items: users = [], isLoading: isUsersLoading } = useUsers();

  const { items: activities = [], isLoading: isActivitiesLoading } =
    useActivities();

  const isSubmitting = create.isPending;

  const isPicking = view !== "form";

  const employees = users.filter((user) => user.role === UserRole.EMPLOYEE);

  const selectedUsers = employees.filter((user) =>
    selectedUserIds.includes(user.id),
  );

  const selectedActivities = activities.filter((activity) =>
    selectedActivityIds.includes(activity.id),
  );

  const handleOpen = () => {
    setInternalOpen(true);
  };

  const handleClose = () => {
    setSelectedUserIds([]);
    setSelectedActivityIds([]);
    setView("form");

    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalOpen(false);
    }
  };

  const handleSubmit = async (data: ProjectFormData) => {
    await create.mutateAsync({
      ...data,
      userIds: selectedUserIds,
      activityIds: selectedActivityIds,
    });

    handleClose();
  };

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((prev) => toggleSelection(prev, userId));
  };

  const handleToggleActivity = (activityId: string) => {
    setSelectedActivityIds((prev) => toggleSelection(prev, activityId));
  };

  const handleBack = () => {
    setView("form");
  };

  const getTitle = () => {
    if (view === "members") {
      return "Add members";
    }

    if (view === "activities") {
      return "Add activities";
    }

    return "Create project";
  };

  const getDescription = () => {
    if (view === "members") {
      return "Select people to add to this project.";
    }

    if (view === "activities") {
      return "Select activities available for this project.";
    }

    return "Create a project to organize work and manage access.";
  };

  return (
    <>
      {!isControlled && (
        <Button type="button" onClick={handleOpen} className="gap-2">
          <Plus className="size-4" />
          Create project
        </Button>
      )}

      <ResourceFormModal
        open={open}
        onClose={handleClose}
        size="lg"
        bodyPadding={!isPicking}
        title={getTitle()}
        description={getDescription()}
        icon={isPicking ? undefined : <FolderKanban className="size-5" />}
        footer={
          isPicking ? (
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="gap-1.5"
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>

              <Button type="button" size="sm" onClick={handleBack}>
                Apply
              </Button>
            </div>
          ) : (
            <div className="flex w-full items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClose}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                form="project-form"
                size="sm"
                isLoading={isSubmitting}
              >
                Create project
              </Button>
            </div>
          )
        }
      >
        {view === "members" ? (
          <div className="px-6 py-5">
            <EntityPicker
              items={employees}
              selectedIds={selectedUserIds}
              onToggle={handleToggleUser}
              getId={(user) => user.id}
              getLabel={fullName}
              getSubtitle={(user) => user.email}
              getAvatarText={initials}
              isLoading={isUsersLoading}
              emptyMessage="No available users found."
              searchPlaceholder="Search people..."
            />
          </div>
        ) : view === "activities" ? (
          <div className="px-6 py-5">
            <EntityPicker
              items={activities}
              selectedIds={selectedActivityIds}
              onToggle={handleToggleActivity}
              getId={(activity) => activity.id}
              getLabel={(activity) => activity.name}
              getSubtitle={(activity) => activity.category?.name}
              isLoading={isActivitiesLoading}
              emptyMessage="No activities found."
              searchPlaceholder="Search activities..."
            />
          </div>
        ) : (
          <div className="space-y-6">
            <ProjectForm
              formId="project-form"
              mode="create"
              defaultValues={{
                name: "",
                description: "",
                status: ProjectStatus.ACTIVE,
              }}
              membersCount={selectedUserIds.length}
              activitiesCount={selectedActivityIds.length}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />

            <div className="border-t border-border pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Team members
                  </h3>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {selectedUsers.length}{" "}
                    {selectedUsers.length === 1
                      ? "person selected"
                      : "people selected"}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setView("members")}
                >
                  Add members
                </Button>
              </div>

              {selectedUsers.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm"
                    >
                      {fullName(user)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Project activities
                  </h3>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {selectedActivities.length}{" "}
                    {selectedActivities.length === 1
                      ? "activity selected"
                      : "activities selected"}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setView("activities")}
                >
                  Add activities
                </Button>
              </div>

              {selectedActivities.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm"
                    >
                      {activity.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </ResourceFormModal>
    </>
  );
}

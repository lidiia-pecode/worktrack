"use client";

import { useState } from "react";

import { ArrowLeft, FolderKanban, Trash2 } from "lucide-react";

import { User } from "@/types";

import { useUserDetails, useUsers } from "@/hooks/useUsers";
import { useProjects } from "@/hooks/useProjects";

import { initials } from "@/lib/utils/user";
import { toggleSelection } from "@/lib/utils/toggle-selection";

import { Button } from "@/components/ui/button";

import { ConfirmModal } from "../shared/ConfirmModal";
import { EntityPicker } from "../shared/resourse/EntityPicker";
import { AssignedList } from "../shared/resourse/AssignedList";
import { ResourceFormModal } from "../shared/resourse/ResourceFormModal";
import { UserForm, UserFormData } from "./UserForm";

type Props = {
  user: User;
  onClose: () => void;
};

type View = "form" | "projects";

export const UpdateUserModal = ({ user, onClose }: Props) => {
  const [view, setView] = useState<View>("form");
  const [edit, setEdit] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingProjectIds, setPendingProjectIds] = useState<string[]>([]);
  const [isSavingProjects, setIsSavingProjects] = useState(false);

  const { data: userDetails, isLoading: isLoadingDetails } = useUserDetails(
    user.id,
  );

  const {
    actions: { update, archive },
  } = useUsers();

  const {
    items: allProjects,
    actions: { update: updateProject },
  } = useProjects();

  const fullName = `${user.firstName} ${user.lastName}`;

  const projectIds = userDetails?.projects.map((project) => project.id) ?? [];

  const assignedProjects = allProjects.filter((project) =>
    projectIds.includes(project.id),
  );

  const handleSave = (data: UserFormData) => {
    update.mutate({ id: user.id, data }, { onSuccess: () => setEdit(false) });
  };

  const handleDelete = async () => {
    await archive.mutateAsync(user.id);
    setDeleteOpen(false);
    onClose();
  };

  const applyProjectMembership = async (
    projectId: string,
    shouldBeMember: boolean,
  ) => {
    const project = allProjects.find((item) => item.id === projectId);
    const existingIds = project?.users?.map((item) => item.id) ?? [];

    const userIds = shouldBeMember
      ? Array.from(new Set([...existingIds, user.id]))
      : existingIds.filter((id) => id !== user.id);

    await updateProject.mutateAsync({ id: projectId, data: { userIds } });
  };

  const openProjectsPicker = () => {
    setPendingProjectIds(projectIds);
    setView("projects");
  };

  const handleToggleProject = (projectId: string) => {
    setPendingProjectIds((current) => toggleSelection(current, projectId));
  };

  const handleApplyProjects = async () => {
    const toAdd = pendingProjectIds.filter((id) => !projectIds.includes(id));
    const toRemove = projectIds.filter((id) => !pendingProjectIds.includes(id));

    setIsSavingProjects(true);
    try {
      await Promise.all([
        ...toAdd.map((id) => applyProjectMembership(id, true)),
        ...toRemove.map((id) => applyProjectMembership(id, false)),
      ]);
      setView("form");
    } finally {
      setIsSavingProjects(false);
    }
  };

  const handleCloseModal = () => {
    setView("form");
    onClose();
  };

  const removeProject = (projectId: string) => {
    applyProjectMembership(projectId, false);
  };

  const isPicking = view === "projects";
  const pendingCount = pendingProjectIds.length;

  return (
    <>
      <ResourceFormModal
        open
        onClose={handleCloseModal}
        size="lg"
        bodyPadding={!isPicking}
        title={isPicking ? "Add projects" : fullName}
        description={
          isPicking
            ? `Select the projects ${user.firstName} should have access to.`
            : user.email
        }
        icon={
          isPicking ? undefined : (
            <span className="text-sm font-semibold">{initials(user)}</span>
          )
        }
        footer={
          isPicking ? (
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setView("form")}
                className="gap-1.5"
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleApplyProjects}
                isLoading={isSavingProjects}
              >
                Apply{pendingCount > 0 ? ` (${pendingCount})` : ""}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-4" />
                Delete user
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => (edit ? setEdit(false) : handleCloseModal())}
                >
                  {edit ? "Cancel" : "Close"}
                </Button>

                {edit ? (
                  <Button
                    type="submit"
                    form="user-modal-form"
                    disabled={update.isPending}
                  >
                    {update.isPending ? "Saving..." : "Save changes"}
                  </Button>
                ) : (
                  <Button type="button" onClick={() => setEdit(true)}>
                    Edit user
                  </Button>
                )}
              </div>
            </div>
          )
        }
      >
        {isPicking ? (
          <div className="px-6 py-5">
            <EntityPicker
              items={allProjects}
              selectedIds={pendingProjectIds}
              onToggle={handleToggleProject}
              getId={(project) => project.id}
              getLabel={(project) => project.name}
              getSubtitle={(project) => project.status}
              renderIcon={() => <FolderKanban className="size-3.5" />}
              emptyMessage="No projects found."
              searchPlaceholder="Search projects..."
            />
          </div>
        ) : (
          <div className="space-y-8">
            <section className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  User information
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Manage this user&apos;s role and position.
                </p>
              </div>

              <UserForm
                formId="user-modal-form"
                defaultValues={{
                  position: user.position ?? "",
                  role: user.role,
                }}
                isEditMode={edit}
                onSubmit={handleSave}
              />
            </section>

            <section className="space-y-4 border-t border-border pt-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Projects
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Control which projects this user can access.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openProjectsPicker}
                  disabled={isLoadingDetails}
                >
                  Manage projects
                </Button>
              </div>

              <div className="rounded-xl border border-border bg-card overflow-hidden">
                {isLoadingDetails ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Loading projects...
                  </div>
                ) : (
                  <AssignedList
                    items={assignedProjects}
                    getId={(project) => project.id}
                    getPrimary={(project) => project.name}
                    getSecondary={(project) => project.status}
                    renderLeading={() => (
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-subtle text-brand">
                        <FolderKanban className="size-4" />
                      </div>
                    )}
                    renderTrailing={(project) => (
                      <Button
                        type="button"
                        variant="ghost"
                        size="iconSm"
                        aria-label={`Remove ${project.name}`}
                        onClick={() => removeProject(project.id)}
                        disabled={updateProject.isPending}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                    emptyMessage="No projects assigned yet."
                  />
                )}
              </div>
            </section>
          </div>
        )}
      </ResourceFormModal>

      <ConfirmModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={archive.isPending}
        title={`Delete "${fullName}"?`}
        message="This user will be permanently removed. This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
};

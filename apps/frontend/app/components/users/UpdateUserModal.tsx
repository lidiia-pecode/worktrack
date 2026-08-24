"use client";

import { useState } from "react";

import { FolderKanban, Mail, Trash2 } from "lucide-react";

import { User } from "@/types";

import { useUserDetails, useUsers } from "@/hooks/useUsers";
import { useProjects } from "@/hooks/useProjects";

import { initials } from "@/lib/utils/user";
import { toggleSelection } from "@/lib/utils/toggle-selection";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { ConfirmModal } from "../shared/ConfirmModal";
import { SelectionDrawer } from "../shared/Selectiondrawer";
import { UserForm, UserFormData } from "./UserForm";

type Props = {
  user: User;
  onClose: () => void;
};

export const UpdateUserModal = ({ user, onClose }: Props) => {
  const [edit, setEdit] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [projectsDrawerOpen, setProjectsDrawerOpen] = useState(false);
  const [pendingProjectIds, setPendingProjectIds] = useState<string[]>([]);

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
    update.mutate(
      {
        id: user.id,
        data,
      },
      {
        onSuccess: () => setEdit(false),
      },
    );
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

    await updateProject.mutateAsync({
      id: projectId,
      data: { userIds },
    });
  };

  const openProjectsDrawer = () => {
    setPendingProjectIds(projectIds);
    setProjectsDrawerOpen(true);
  };

  const handleToggleProject = (projectId: string) => {
    setPendingProjectIds((current) => toggleSelection(current, projectId));
  };

  const handleSaveProjects = async () => {
    const toAdd = pendingProjectIds.filter((id) => !projectIds.includes(id));

    const toRemove = projectIds.filter((id) => !pendingProjectIds.includes(id));

    await Promise.all([
      ...toAdd.map((id) => applyProjectMembership(id, true)),
      ...toRemove.map((id) => applyProjectMembership(id, false)),
    ]);

    setProjectsDrawerOpen(false);
  };

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-6 py-5">
            <div className="flex items-start justify-between gap-4 pr-8">
              <div className="flex items-center gap-3">
                <div
                  className="
                    flex size-11 shrink-0 items-center justify-center
                    rounded-xl bg-brand-subtle
                    text-sm font-semibold text-primary
                  "
                >
                  {initials(user)}
                </div>

                <div className="min-w-0">
                  <DialogTitle className="truncate">{fullName}</DialogTitle>

                  <DialogDescription className="mt-0.5 flex items-center gap-1.5">
                    <Mail className="size-3.5" />
                    {user.email}
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
            <div className="space-y-8">
              {/* User information */}
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

              {/* Projects */}

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
                    onClick={openProjectsDrawer}
                    disabled={isLoadingDetails}
                  >
                    Add projects
                  </Button>
                </div>

                {isLoadingDetails ? (
                  <div className="py-5 text-center text-sm text-muted-foreground">
                    Loading projects...
                  </div>
                ) : assignedProjects.length ? (
                  <div className="flex flex-wrap gap-2">
                    {assignedProjects.map((project) => (
                      <span
                        key={project.id}
                        className="
                            inline-flex items-center gap-1.5
                            rounded-full
                            bg-accent px-3 py-1.5
                            text-xs font-medium
                            text-accent-foreground
                          "
                      >
                        <FolderKanban className="size-3.5" />
                        {project.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div
                    className="
                        rounded-xl border border-dashed
                        border-border px-4 py-5
                        text-center
                      "
                  >
                    <p className="text-sm text-muted-foreground">
                      No projects assigned yet.
                    </p>
                  </div>
                )}
              </section>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border px-6 py-4">
            <Button
              type="button"
              variant="ghost"
              className="
                  text-destructive
                  hover:bg-destructive/10
                  hover:text-destructive
                "
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-4" />
              Delete user
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => (edit ? setEdit(false) : onClose())}
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
        </DialogContent>
      </Dialog>

      {projectsDrawerOpen && (
        <SelectionDrawer
          open={projectsDrawerOpen}
          items={allProjects}
          selectedIds={pendingProjectIds}
          onToggle={handleToggleProject}
          onClose={() => setProjectsDrawerOpen(false)}
          hasNextPage={false}
          isFetchingNextPage={false}
          onLoadMore={() => {}}
          onSave={handleSaveProjects}
          title="Add projects"
          emptyMessage="No projects found"
          getId={(project) => project.id}
          getLabel={(project) => project.name}
          getSubtitle={(project) => project.status}
        />
      )}

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

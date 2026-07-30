"use client";

import { useState } from "react";

import { User } from "@/types";
import { useUsers } from "@/hooks/useUsers";
import { useProjects } from "@/hooks/useProjects";

import { Modal } from "../shared/Modal/Modal";
import { ModalHeader } from "../shared/Modal/ModalHeader";
import { ConfirmModal } from "../shared/ConfirmModal";
import { FormSection } from "../shared/FormSection";
import { AssignmentSection } from "../shared/AsigmentSection";
import { ActivityChip } from "../shared/ActivityChip";
import { SelectionDrawer } from "../shared/Selectiondrawer";
import { toggleSelection } from "@/lib/utils/toggle-selection";

import { UserForm, UserFormData } from "./UserForm";

type Props = {
  user: User;
  isAdmin: boolean;
  onClose: () => void;
};

export const UpdateUserModal = ({ user, isAdmin, onClose }: Props) => {
  const [edit, setEdit] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // --- Projects assignment ---
  const [projectIds, setProjectIds] = useState<string[]>(
    () => user.projects?.map((p) => p.id) ?? [],
  );
  const [pendingProjectIds, setPendingProjectIds] =
    useState<string[]>(projectIds);
  const [projectsDrawerOpen, setProjectsDrawerOpen] = useState(false);

  const {
    actions: { update, archive },
  } = useUsers();

  const {
    items: allProjects,
    actions: { update: updateProject },
  } = useProjects();

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
    const project = allProjects.find((p) => p.id === projectId);
    const existingIds = project?.users?.map((u) => u.id) ?? [];

    const nextUserIds = shouldBeMember
      ? Array.from(new Set([...existingIds, user.id]))
      : existingIds.filter((id) => id !== user.id);

    await updateProject.mutateAsync({
      id: projectId,
      data: { userIds: nextUserIds },
    });
  };

  const handleRemoveProject = (projectId: string) => {
    applyProjectMembership(projectId, false);
    setProjectIds((prev) => prev.filter((id) => id !== projectId));
  };

  const openProjectsDrawer = () => {
    setPendingProjectIds(projectIds);
    setProjectsDrawerOpen(true);
  };

  const handleTogglePendingProject = (id: string) => {
    setPendingProjectIds((prev) => toggleSelection(prev, id));
  };

  const handleSaveProjects = async () => {
    const toAdd = pendingProjectIds.filter((id) => !projectIds.includes(id));
    const toRemove = projectIds.filter((id) => !pendingProjectIds.includes(id));

    await Promise.all([
      ...toAdd.map((id) => applyProjectMembership(id, true)),
      ...toRemove.map((id) => applyProjectMembership(id, false)),
    ]);

    setProjectIds(pendingProjectIds);
    setProjectsDrawerOpen(false);
  };

  const assignedProjects = allProjects.filter((p) => projectIds.includes(p.id));

  return (
    <>
      <Modal isOpen onClose={onClose} contentClassName="pb-6">
        <ModalHeader
          title="User details"
          edit={edit}
          isAdmin={isAdmin}
          onToggleEdit={() => setEdit((prev) => !prev)}
          onSave={() =>
            document.getElementById("user-modal-form")?.dispatchEvent(
              new Event("submit", {
                bubbles: true,
                cancelable: true,
              }),
            )
          }
          onClose={onClose}
        />

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-8">
            {/* Avatar & name */}
            <div className="flex items-center gap-4">
              <div className="size-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-2xl font-semibold shrink-0">
                {user.firstName[0]}
                {user.lastName[0]}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">
                  {user.firstName} {user.lastName}
                </h2>
                <p className="text-sm text-zinc-500">{user.email}</p>
              </div>
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

            {isAdmin ? (
              <AssignmentSection
                title="Projects"
                addLabel="Add project"
                onOpenDrawer={openProjectsDrawer}
              >
                {assignedProjects.map((project) => (
                  <ActivityChip
                    key={project.id}
                    label={project.name}
                    onRemove={() => handleRemoveProject(project.id)}
                  />
                ))}
              </AssignmentSection>
            ) : (
              <FormSection label="Projects">
                <div className="flex flex-wrap gap-2">
                  {assignedProjects.map((project) => (
                    <span
                      key={project.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-zinc-50 text-zinc-700 ring-1 ring-zinc-200 px-3 py-1 text-xs font-medium"
                    >
                      {project.name}
                    </span>
                  ))}
                </div>
              </FormSection>
            )}
          </div>
        </div>

        {projectsDrawerOpen && (
          <SelectionDrawer
            open={projectsDrawerOpen}
            items={allProjects}
            selectedIds={pendingProjectIds}
            onToggle={handleTogglePendingProject}
            onClose={() => setProjectsDrawerOpen(false)}
            hasNextPage={false}
            isFetchingNextPage={false}
            onLoadMore={() => {}}
            onSave={handleSaveProjects}
            title="Add projects"
            emptyMessage="No projects found"
            getId={(p) => p.id}
            getLabel={(p) => p.name}
            getSubtitle={(p) => p.status}
          />
        )}

        {isAdmin && (
          <ConfirmModal
            isOpen={deleteOpen}
            onClose={() => setDeleteOpen(false)}
            onConfirm={handleDelete}
            loading={archive.isPending}
            title={`Delete "${user.firstName} ${user.lastName}"?`}
            message="This user will be permanently removed. This action cannot be undone."
            confirmText="Delete"
            variant="danger"
          />
        )}
      </Modal>
    </>
  );
};

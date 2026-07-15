"use client";

import { useState } from "react";

import { Project } from "@/types";
import { ProjectStatus } from "@/types/enums";

import { useProjects } from "@/hooks/useProjects";
import { useUsers } from "@/hooks/useUsers";

import { getNonAdminMemberIds } from "../helpers";

import { MemberList } from "../ui/Member/MemberList";
import { MemberDrawer } from "../ui/Member/MemberDrawer";
import { Modal } from "../ui/Modal/Modal";
import { ModalHeader } from "../ui/Modal/ModalHeader";

import { ProjectForm, ProjectFormData } from "./ProjectForm";
import { ArchiveProjectModal } from "./ArchiveProjectModal";
import Button from "../ui/Button";
import { ActivitiesList } from "../ui/Member/ActivitiesList";
import { ActivitiesDrawer } from "../ui/Member/ActivitiesDrawer";

type UpdateProjectModalProps = {
  project: Project;
  isAdmin: boolean;
  onClose: () => void;
  onDelete: () => void;
};

export const UpdateProjectModal = ({
  project,
  isAdmin,
  onClose,
}: UpdateProjectModalProps) => {
  const [edit, setEdit] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activitiesDrawerOpen, setActivitiesDrawerOpen] = useState(false);

  const [archiveOpen, setArchiveOpen] = useState(false);

  const [memberIds, setMemberIds] = useState<string[]>(
    () => project.users?.map((u) => u.id) || [],
  );
  const [activityIds, setActivityIds] = useState<string[]>(
    () => project.projectActivities?.map((a) => a.activity.id) || [],
  );

  const { users, pagination } = useUsers();

  const { updateProject, archiveProject, unarchiveProject } = useProjects();

  const handleSave = (data: ProjectFormData) => {
    updateProject.mutate({
      id: project.id,
      data: {
        ...data,
        userIds: getNonAdminMemberIds(users, memberIds),
        activityIds,
      },
    });

    setEdit(false);
  };

  const handleArchive = async () => {
    await archiveProject.mutateAsync(project.id);

    setArchiveOpen(false);
    onClose();
  };

  const handleRestore = async () => {
    await unarchiveProject.mutateAsync(project.id);

    onClose();
  };

  const handleSetMembers = (id: string) => {
    setMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSetActivities = (id: string) =>
    setActivityIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const handleSaveMembers = () => {
    updateProject.mutate({
      id: project.id,
      data: {
        userIds: getNonAdminMemberIds(users, memberIds),
      },
    });

    setDrawerOpen(false);
  };

  const handleSaveProjectActivities = () => {
    updateProject.mutate({
      id: project.id,
      data: {
        activityIds,
      },
    });

    setDrawerOpen(false);
  };

  return (
    <Modal contentClassName="pb-6" onClose={onClose} isOpen={true}>
      <ModalHeader
        edit={edit}
        isAdmin={isAdmin}
        onToggleEdit={() => setEdit(!edit)}
        onSave={() =>
          document.getElementById("project-modal-form")?.dispatchEvent(
            new Event("submit", {
              cancelable: true,
              bubbles: true,
            }),
          )
        }
        onClose={onClose}
        onDelete={() => {}}
      />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
        <ProjectForm
          formId="project-modal-form"
          isEditMode={edit}
          defaultValues={{
            name: project.name,
            description: project.description || "",
            status: project.status,
          }}
          onSubmit={handleSave}
        />

        <MemberList
          members={users.filter((u) => memberIds.includes(u.id))}
          editable={edit || isAdmin}
          onRemove={handleSetMembers}
          onOpenDrawer={() => setDrawerOpen(true)}
        />

        <ActivitiesList
          activities={project.projectActivities}
          editable={true}
          onRemove={(id) =>
            setActivityIds((prev) => prev.filter((x) => x !== id))
          }
          onOpenDrawer={() => setActivitiesDrawerOpen(true)}
        />
      </div>

      {/* Sticky footer */}
      <div className="border-t border-zinc-200 px-6 py-4 bg-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">
          Project Status
        </p>

        {project.status === ProjectStatus.ACTIVE ? (
          <Button
            variant="danger"
            size="sm"
            className="w-fit"
            onClick={() => setArchiveOpen(true)}
          >
            Archive Project
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            className="w-fit"
            onClick={handleRestore}
            isLoading={unarchiveProject.isPending}
          >
            Restore Project
          </Button>
        )}
      </div>

      {drawerOpen && (
        <MemberDrawer
          open={drawerOpen}
          users={users}
          memberIds={memberIds}
          onToggle={handleSetMembers}
          onClose={() => setDrawerOpen(false)}
          hasNextPage={pagination.hasNextPage}
          isFetchingNextPage={pagination.isFetchingNextPage}
          onLoadMore={pagination.fetchNextPage}
          onSave={handleSaveMembers}
        />
      )}

      {activitiesDrawerOpen && (
        <ActivitiesDrawer
          open={activitiesDrawerOpen}
          activitiesIds={activityIds}
          onToggle={handleSetActivities}
          onClose={() => setActivitiesDrawerOpen(false)}
          hasNextPage={pagination.hasNextPage}
          isFetchingNextPage={pagination.isFetchingNextPage}
          onLoadMore={pagination.fetchNextPage}
          onSave={handleSaveProjectActivities}
        />
      )}

      <ArchiveProjectModal
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        isLoading={archiveProject.isPending}
        onConfirm={handleArchive}
      />
    </Modal>
  );
};

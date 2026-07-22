"use client";

import { useState } from "react";

import { Project } from "@/types";
import { UserRole } from "@/types/enums";

import { useProjects } from "@/hooks/useProjects";
import { useUsers } from "@/hooks/useUsers";
import { fullName, getNonAdminMemberIds, initials } from "../helpers";

import { Modal } from "../shared/Modal/Modal";
import { ModalHeader } from "../shared/Modal/ModalHeader";
import { ProjectForm, ProjectFormData } from "./ProjectForm";
import { useActivities } from "@/hooks/useActivities";
import { AssignmentSection } from "../shared/AsigmentSection";
import { MemberChip } from "../shared/MemberChip";
import { ActivityChip } from "../shared/ActivityChip";
import { toggleSelection } from "@/utils/toggleSelection";
import { SelectionDrawer } from "../shared/Selectiondrawer";
import { ConfirmModal } from "../shared/ConfirmModal";

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
  const [memberDrawerOpen, setMemberDrawerOpen] = useState(false);
  const [activitiesDrawerOpen, setActivitiesDrawerOpen] = useState(false);

  const [archiveOpen, setArchiveOpen] = useState(false);

  const [memberIds, setMemberIds] = useState<string[]>(
    () => project.users?.map((u) => u.id) || [],
  );
  const [activityIds, setActivityIds] = useState<string[]>(
    () => project.projectActivities?.map((a) => a.activity.id) || [],
  );

  const { users, pagination } = useUsers();

  const {
    actions: { update, archive, unarchive },
  } = useProjects();
  const { items: activities } = useActivities();

  const handleSave = (data: ProjectFormData) => {
    update.mutate({
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
    await archive.mutateAsync(project.id);

    setArchiveOpen(false);
    onClose();
  };

  const handleRestore = async () => {
    await unarchive.mutateAsync(project.id);

    onClose();
  };

  const handleSetMembers = (id: string) => {
    setMemberIds((prev) => toggleSelection(prev, id));
  };

  const handleSetActivities = (id: string) => {
    setActivityIds((prev) => toggleSelection(prev, id));
  };

  const handleSaveMembers = () => {
    update.mutate({
      id: project.id,
      data: {
        userIds: getNonAdminMemberIds(users, memberIds),
      },
    });

    setMemberDrawerOpen(false);
  };

  const handleSaveProjectActivities = () => {
    update.mutate({
      id: project.id,
      data: {
        activityIds,
      },
    });

    setActivitiesDrawerOpen(false);
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
          membersCount={memberIds.length}
          activitiesCount={activityIds.length}
          onArchive={() => setArchiveOpen(true)}
          onRestore={handleRestore}
          archiveLoading={archive.isPending || unarchive.isPending}
          onSubmit={handleSave}
        />

        <AssignmentSection
          title="Team members"
          addLabel="Add member"
          onOpenDrawer={() => setMemberDrawerOpen(true)}
        >
          {users
            .filter((u) => memberIds.includes(u.id) && u.role === UserRole.USER)
            .map((user) => (
              <MemberChip
                key={user.id}
                label={fullName(user)}
                avatar={initials(user)}
                onRemove={() => handleSetMembers(user.id)}
              />
            ))}
        </AssignmentSection>

        <AssignmentSection
          title="Project activities"
          addLabel="Add activity"
          onOpenDrawer={() => setActivitiesDrawerOpen(true)}
        >
          {activities
            .filter((activity) => activityIds.includes(activity.id))
            .map((activity) => (
              <ActivityChip
                key={activity.id}
                label={activity.name}
                onRemove={() => handleSetActivities(activity.id)}
              />
            ))}
        </AssignmentSection>
      </div>

      {memberDrawerOpen && (
        <SelectionDrawer
          open={memberDrawerOpen}
          items={users.filter((u) => u.role === UserRole.USER)}
          selectedIds={memberIds}
          onToggle={handleSetMembers}
          onClose={() => setMemberDrawerOpen(false)}
          hasNextPage={pagination.hasNextPage}
          isFetchingNextPage={pagination.isFetchingNextPage}
          onLoadMore={pagination.fetchNextPage}
          onSave={handleSaveMembers}
          title="Add members"
          emptyMessage="No users found"
          getId={(u) => u.id}
          getLabel={fullName}
          getSubtitle={(u) => u.role}
          getAvatarText={initials}
        />
      )}

      {activitiesDrawerOpen && (
        <SelectionDrawer
          open={activitiesDrawerOpen}
          items={activities}
          selectedIds={activityIds}
          onToggle={handleSetActivities}
          onClose={() => setActivitiesDrawerOpen(false)}
          hasNextPage={pagination.hasNextPage}
          isFetchingNextPage={pagination.isFetchingNextPage}
          onLoadMore={pagination.fetchNextPage}
          onSave={handleSaveProjectActivities}
          title="Add activities"
          emptyMessage="No activities found"
          getId={(a) => a.id}
          getLabel={(a) => a.name}
          getSubtitle={(a) => a.category?.name}
        />
      )}

      {/* <ArchiveModal
        entity="project"
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        isLoading={archive.isPending}
        onConfirm={handleArchive}
      /> */}

      <ConfirmModal
        isOpen={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={handleArchive}
        loading={archive.isPending}
        title={`Are you sure you want to delete "${project.name}"?`}
      />
    </Modal>
  );
};

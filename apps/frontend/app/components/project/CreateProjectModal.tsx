"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { useProjects } from "@/hooks/useProjects";
import { useUsers } from "@/hooks/useUsers";
import { ProjectStatus, UserRole } from "@/types/enums";

import Button, { CloseButton } from "../ui/Button";
import { ProjectForm, ProjectFormData } from "./ProjectForm";
import { Modal } from "../ui/Modal/Modal";
import { useActivities } from "@/hooks/useActivities";
import { fullName, initials } from "../helpers";
import { AssignmentSection } from "../ui/AsigmentSection";
import { MemberChip } from "../ui/MemberChip";
import { ActivityChip } from "../ui/ActivityChip";
import { toggleSelection } from "@/utils/toggleSelection";
import { SelectionDrawer } from "../ui/Selectiondrawer";

export function CreateProjectModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [memberDrawerOpen, setMemberDrawerOpen] = useState(false);
  const [activitiesDrawerOpen, setActivitiesDrawerOpen] = useState(false);

  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [activityIds, setActivityIds] = useState<string[]>([]);

  const {
    actions: { create },
  } = useProjects();
  const { users, pagination } = useUsers();

  const { items: activities } = useActivities();

  const handleCreate = async (data: ProjectFormData) => {
    await create.mutateAsync({
      ...data,
      userIds: memberIds,
    });
    setIsOpen(false);
    setMemberIds([]);
  };

  const handleSetMembers = (id: string) => {
    setMemberIds((prev) => toggleSelection(prev, id));
  };

  const handleSetActivities = (id: string) => {
    setActivityIds((prev) => toggleSelection(prev, id));
  };

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => setIsOpen(true)}
        className="group mb-6"
      >
        <Plus
          size={18}
          className="transition-transform group-hover:rotate-90"
        />
        <span>Create Project</span>
      </Button>

      <Modal
        size="xl"
        fullHeight
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Create project
          </p>
          <div className="flex items-center gap-2">
            <Button
              form="create-project-form"
              type="submit"
              disabled={create.isPending}
              size="sm"
              className="flex items-center gap-1.5"
            >
              {create.isPending ? "Creating..." : "Create"}
            </Button>

            <CloseButton onClick={() => setIsOpen(false)} />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          <ProjectForm
            formId="create-project-form"
            isEditMode={true}
            defaultValues={{
              name: "",
              description: "",
              status: ProjectStatus.ACTIVE,
            }}
            membersCount={memberIds.length}
            activitiesCount={activityIds.length}
            onSubmit={handleCreate}
          />

          <AssignmentSection
            title="Team members"
            addLabel="Add member"
            onOpenDrawer={() => setMemberDrawerOpen(true)}
          >
            {users
              .filter(
                (u) => memberIds.includes(u.id) && u.role === UserRole.USER,
              )
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

            title="Add activities"
            emptyMessage="No activities found"
            getId={(a) => a.id}
            getLabel={(a) => a.name}
            getSubtitle={(a) => a.category?.name}
          />
        )}
      </Modal>
    </>
  );
}

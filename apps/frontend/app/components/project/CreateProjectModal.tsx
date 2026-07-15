"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { useProjects } from "@/hooks/useProjects";
import { useUsers } from "@/hooks/useUsers";
import { ProjectStatus } from "@/types/enums";

import Button, { CloseButton } from "../ui/Button";
import { MemberList } from "../ui/Member/MemberList";
import { MemberDrawer } from "../ui/Member/MemberDrawer";
import { ProjectForm, ProjectFormData } from "./ProjectForm";
import { Modal } from "../ui/Modal/Modal";
import { ActivitiesList } from "../ui/Member/ActivitiesList";
import { ActivitiesDrawer } from "../ui/Member/ActivitiesDrawer";

export function CreateProjectModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [memberDrawerOpen, setMemberDrawerOpen] = useState(false);
  const [activitiesDrawerOpen, setActivitiesDrawerOpen] = useState(false);

  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [projectActIds, setProjectActIds] = useState<string[]>([]);

  const { createProject } = useProjects();
  const { users, pagination } = useUsers();

  const handleCreate = async (data: ProjectFormData) => {
    await createProject.mutateAsync({
      ...data,
      userIds: memberIds,
    });
    setIsOpen(false);
    setMemberIds([]);
  };

  const handleSetMembers = (id: string) =>
    setMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const handleSetActivities = (id: string) =>
    setProjectActIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

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
              disabled={createProject.isPending}
              size="sm"
              className="flex items-center gap-1.5"
            >
              {createProject.isPending ? "Creating..." : "Create"}
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
            onSubmit={handleCreate}
          />
          <MemberList
            members={users.filter((u) => memberIds.includes(u.id))}
            editable={true}
            onRemove={(id) =>
              setMemberIds((prev) => prev.filter((x) => x !== id))
            }
            onOpenDrawer={() => setMemberDrawerOpen(true)}
          />

          <ActivitiesList
            activities={[]}
            editable={true}
            onRemove={(id) =>
              setProjectActIds((prev) => prev.filter((x) => x !== id))
            }
            onOpenDrawer={() => setActivitiesDrawerOpen(true)}
          />
        </div>

        {memberDrawerOpen && (
          <MemberDrawer
            open={memberDrawerOpen}
            users={users}
            memberIds={memberIds}
            onToggle={handleSetMembers}
            onClose={() => setMemberDrawerOpen(false)}
            hasNextPage={pagination.hasNextPage}
            isFetchingNextPage={pagination.isFetchingNextPage}
            onLoadMore={pagination.fetchNextPage}
          />
        )}

        {activitiesDrawerOpen && (
          <ActivitiesDrawer
            open={activitiesDrawerOpen}
            activitiesIds={projectActIds}
            onToggle={handleSetActivities}
            onClose={() => setActivitiesDrawerOpen(false)}
            hasNextPage={pagination.hasNextPage}
            isFetchingNextPage={pagination.isFetchingNextPage}
            onLoadMore={pagination.fetchNextPage}
          />
        )}
      </Modal>
    </>
  );
}

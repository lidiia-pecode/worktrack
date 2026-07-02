import { Project } from "@/types";
import { useProjects } from "@/hooks/useProjects";
import { useUsers } from "@/hooks/useUsers";
import { useState } from "react";
import { getNonAdminMemberIds } from "../helpers";
import { MemberList } from "../ui/Member/MemberList";
import { MemberDrawer } from "../ui/Member/MemberDrawer";
import { ModalHeader } from "../ui/Modal/ModalHeader";
import { ProjectForm, ProjectFormData } from "./ProjectForm";
import { Modal } from "../ui/Modal/Modal";

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
  onDelete,
}: UpdateProjectModalProps) => {
  const [edit, setEdit] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [memberIds, setMemberIds] = useState<string[]>(
    () => (project.users?.map((u) => u.id).filter(Boolean) as string[]) || [],
  );

  const { users, pagination } = useUsers();
  const { updateProject } = useProjects();

  const handleSave = (data: ProjectFormData) => {
    updateProject.mutate({
      id: project.id,
      data: { ...data, userIds: getNonAdminMemberIds(users, memberIds) },
    });
    setEdit(false);
  };

  const toggleMember = (id: string) => {
    const newIds = memberIds.includes(id)
      ? memberIds.filter((x) => x !== id)
      : [...memberIds, id];
    setMemberIds(newIds);
    updateProject.mutate({
      id: project.id,
      data: { userIds: getNonAdminMemberIds(users, newIds) },
    });
  };

  return (
    <Modal onClose={onClose} isOpen={true}>
      <ModalHeader
        edit={edit}
        isAdmin={isAdmin}
        onToggleEdit={() => setEdit(!edit)}
        onSave={() =>
          document
            .getElementById("project-modal-form")
            ?.dispatchEvent(
              new Event("submit", { cancelable: true, bubbles: true }),
            )
        }
        onClose={onClose}
        onDelete={onDelete}
      />

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
        <ProjectForm
          formId="project-modal-form"
          isEditMode={edit}
          defaultValues={{
            name: project.name,
            description: project.description || "",
            estimate: project.estimate || 0,
            status: project.status,
          }}
          onSubmit={handleSave}
        />

        <MemberList
          members={users.filter((u) => memberIds.includes(u.id))}
          editable={edit || isAdmin}
          onRemove={toggleMember}
          onAddClick={() => setDrawerOpen(true)}
        />
      </div>

      {drawerOpen && (
        <MemberDrawer
          open={drawerOpen}
          users={users}
          memberIds={memberIds}
          onToggle={toggleMember}
          onClose={() => setDrawerOpen(false)}
          hasNextPage={pagination.hasNextPage}
          isFetchingNextPage={pagination.isFetchingNextPage}
          onLoadMore={pagination.fetchNextPage}
        />
      )}
    </Modal>
  );
};

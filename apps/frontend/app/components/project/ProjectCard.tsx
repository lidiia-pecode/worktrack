import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Users } from "lucide-react";

import { useProjects } from "@/hooks/useProjects";
import { Project } from "@/types";

import { StatusBadge } from "../shared/StatusBadge";
import { EntityCard } from "../shared/EntityCard";
import { UpdateProjectModal } from "./UpdateProjectModal";
import { ConfirmModal } from "../shared/ConfirmModal";
import { ProjectStatus } from "@/types/enums";

type Props = { project: Project; canManage: boolean };

export const ProjectCard = ({ project, canManage }: Props) => {
  const [open, setOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const {
    actions: { archive },
  } = useProjects();

  const members = useMemo(
    () => (project.users ?? []).filter((u) => !isAdminRole(u.role)),
    [project.users],
  );

  const handleConfirmArchive = () => {
    archive.mutate(project.id);
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <EntityCard
        onClick={() => setOpen(true)}
        isArchived={project.status === ProjectStatus.ARCHIVED}
      >
        <EntityCard.Header>
          <div className="min-w-0">
            <EntityCard.Title>{project.name}</EntityCard.Title>
            <EntityCard.Description>
              <ReactMarkdown>
                {project.description || "No description"}
              </ReactMarkdown>
            </EntityCard.Description>
          </div>
        </EntityCard.Header>

        <EntityCard.Footer>
          <StatusBadge status={project.status} />
          <EntityCard.Meta icon={Users}>
            {members.length === 0
              ? "No members assigned"
              : `${members.length} ${members.length === 1 ? "member" : "members"}`}
          </EntityCard.Meta>
        </EntityCard.Footer>
      </EntityCard>

      {open && (
        <UpdateProjectModal
          project={project}
          canManage={canManage}
          onClose={() => setOpen(false)}
          onDelete={() => setShowDeleteConfirm(true)}
        />
      )}

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmArchive}
        loading={archive.isPending}
        title={`Archive "${project.name}"?`}
        message="Archived projects will be hidden from the active list. You can restore them later."
        confirmText="Archive"
        variant="archive"
      />
    </>
  );
};

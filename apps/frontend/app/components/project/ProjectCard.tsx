import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Users } from "lucide-react";

import { useProjects } from "@/hooks/useProjects";
import { Project } from "@/types";
import { isAdminRole } from "../helpers";

import { StatusBadge } from "../shared/StatusBadge";
import { EntityCard } from "../shared/EntityCard";
import { UpdateProjectModal } from "./UpdateProjectModal";
import { ConfirmModal } from "../shared/ConfirmModal";

type Props = { project: Project; isAdmin: boolean };

export const ProjectCard = ({ project, isAdmin }: Props) => {
  const [open, setOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const {
    actions: { delete: archive },
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
      <EntityCard onClick={() => setOpen(true)}>
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
          isAdmin={isAdmin}
          onClose={() => setOpen(false)}
          onDelete={() => setShowDeleteConfirm(true)}
        />
      )}

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmArchive}
        title={`Are you sure you want delete the "${project.name}"?`}
      />
    </>
  );
};

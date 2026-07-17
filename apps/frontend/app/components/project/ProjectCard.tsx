import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Users } from "lucide-react";

import { useProjects } from "@/hooks/useProjects";
import { useUsers } from "@/hooks/useUsers";
import { Project } from "@/types";
import { isAdminRole } from "../helpers";

import { StatusBadge } from "../ui/StatusBadge";
import { UpdateProjectModal } from "./UpdateProjectModal";
import { ConfirmModal } from "../ui/ConfirmModal";

type Props = { project: Project; isAdmin: boolean };

export const ProjectCard = ({ project, isAdmin }: Props) => {
  const [open, setOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { users } = useUsers();
  const { archiveProject } = useProjects();

  console.log(users);

  const members = useMemo(
    () => (project.users ?? []).filter((u) => !isAdminRole(u.role)),
    [project.users],
  );

  const handleConfirmArchive = () => {
    archiveProject.mutate(project.id);
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <article
        onClick={() => setOpen(true)}
        className="group relative flex flex-col gap-4 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all duration-200 cursor-pointer"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-zinc-900 truncate leading-snug">
              {project.name}
            </h3>
            <div className="text-sm text-zinc-400 mt-0.5 line-clamp-3 leading-relaxed">
              <ReactMarkdown>
                {project.description || "No description"}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-auto">
          <StatusBadge status={project.status} />

          <span className="flex items-center gap-1 text-xs text-zinc-500">
            <Users size={13} />
            {members.length === 0
              ? "No members assigned"
              : `${members.length} ${members.length === 1 ? "member" : "members"}`}
          </span>
        </div>
      </article>

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

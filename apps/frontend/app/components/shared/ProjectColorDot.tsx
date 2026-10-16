import { cn } from "@/lib/utils/cn";
import { getProjectColor } from "@/lib/utils/project-colors";

interface ProjectColorDotProps {
  projectId: string;
  className?: string;
}

/** The project's colour, as its entries show it on the timesheet. */
export const ProjectColorDot = ({
  projectId,
  className,
}: ProjectColorDotProps) => (
  <span
    aria-hidden="true"
    className={cn("block size-2.5 shrink-0 rounded-full", className)}
    style={{ backgroundColor: getProjectColor(projectId) }}
  />
);

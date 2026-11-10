import { cn } from "@/lib/utils/cn";
import { getProjectColor } from "@/lib/utils/project-colors";

interface ProjectColorDotProps {
  projectId: string;
  className?: string;
}

/**
 * The project's colour at full strength: the entries' own tint is translucent
 * and too pale for a dot this small. Relative colour keeps the origin's alpha
 * unless it is given, hence `/ 1`.
 */
export const ProjectColorDot = ({
  projectId,
  className,
}: ProjectColorDotProps) => (
  <span
    aria-hidden="true"
    className={cn("block size-2.5 shrink-0 rounded-full", className)}
    style={{
      backgroundColor: `oklch(from ${getProjectColor(projectId)} l c h / 1)`,
    }}
  />
);

import { PROJECT_COLORS } from "../constants/project-colors";

function hashString(value: string): number {
  let hash = 0;

  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash);
}

export function getProjectColor(projectId: string): string {
  return PROJECT_COLORS[hashString(projectId) % PROJECT_COLORS.length];
}

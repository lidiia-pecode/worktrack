const PROJECT_COLORS = [
  "rgba(59, 130, 246, 0.3)",
  "rgba(16, 185, 129, 0.3)",
  "rgba(139, 92, 246, 0.3)",
  "rgba(245, 158, 11, 0.3)",
  "rgba(239, 68, 68, 0.3)",
  "rgba(6, 182, 212, 0.3)",
  "rgba(99, 102, 241, 0.3)",
  "rgba(20, 184, 166, 0.3)",
  "rgba(236, 72, 153, 0.3)",
  "rgba(132, 204, 22, 0.3)",
] as const;

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

/**
 * Projects don't have a `color` field in the backend, so we derive a stable
 * color client-side from the project id. Same project -> same color, always,
 * without needing to persist anything.
 */
const PALETTE = [
  { bg: "#3B82F6", soft: "#EFF6FF" }, // blue
  { bg: "#10B981", soft: "#ECFDF5" }, // emerald
  { bg: "#F59E0B", soft: "#FFFBEB" }, // amber
  { bg: "#EF4444", soft: "#FEF2F2" }, // red
  { bg: "#8B5CF6", soft: "#F5F3FF" }, // violet
  { bg: "#EC4899", soft: "#FDF2F8" }, // pink
  { bg: "#14B8A6", soft: "#F0FDFA" }, // teal
  { bg: "#F97316", soft: "#FFF7ED" }, // orange
  { bg: "#6366F1", soft: "#EEF2FF" }, // indigo
  { bg: "#84CC16", soft: "#F7FEE7" }, // lime
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0; // force 32-bit int
  }
  return Math.abs(hash);
}

export function getProjectColor(projectId: string): { bg: string; soft: string } {
  const index = hashString(projectId) % PALETTE.length;
  return PALETTE[index];
}

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

/**
 * The surface logged time sits on: its project's colour mixed down to the
 * card, rather than laid over it, so an entry looks the same over a weekend's
 * stripes or a day's excess.
 */
export function entryTint(color: string): string {
  return `color-mix(in oklab, ${color} var(--entry-tint), var(--card))`;
}

/**
 * A plan's surface: a light mix of the same colour with no edge, so a plan
 * reads as its project's, but as time not yet worked.
 */
export function planSurface(color: string) {
  return {
    backgroundColor: `color-mix(in oklab, ${color} var(--plan-tint), var(--card))`,
  };
}

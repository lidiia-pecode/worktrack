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
 * The surface an entry's text sits on: its project's colour mixed down to the
 * card, rather than laid over it, so an entry looks the same over a weekend's
 * stripes or a day's excess.
 */
export function entryTint(color: string): string {
  return `color-mix(in oklab, ${color} var(--entry-tint), var(--card))`;
}

/**
 * An entry drawn as a block: the tint, with the project's colour as a solid
 * bar at the leading edge. A chip is a line and carries its colour as a dot
 * instead, since a bar that short reads as an accident.
 */
export function entryBlockStyle(color: string) {
  return {
    backgroundColor: entryTint(color),
    backgroundImage: `linear-gradient(to right, ${color} 0 var(--entry-bar), transparent var(--entry-bar))`,
  };
}

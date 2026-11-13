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
 * An entry drawn as a block, in a day's column or its list. It has no dot to
 * carry the project's colour, so its ground takes more of it than a chip's.
 */
export function entryBlockStyle(color: string) {
  return {
    backgroundColor: `color-mix(in oklab, ${color} var(--entry-block-tint), var(--card))`,
  };
}

export type EntryChoice = { projectId: string; activityId: string };

/** Per viewer and per person the entry is for, so a manager's choices for one person don't leak into another's. */
export const lastEntryChoiceKey = (viewerId: string, subjectId: string) =>
  `worktrack:last-entry:${viewerId}:${subjectId}`;

// Storage can be blocked, and what it holds can't be trusted to parse. The form
// uses a stored choice only if it matches a pair the person can log against.
export const readLastEntryChoice = (key: string): EntryChoice | null => {
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
};

export const storeLastEntryChoice = (key: string, choice: EntryChoice) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(choice));
  } catch {
    // Storage is blocked; the next form starts without a remembered choice.
  }
};

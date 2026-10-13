export enum ActiveActivitiesAction {
  MOVE = 'MOVE',
  ARCHIVE = 'ARCHIVE',
  /** Leaves them as drafts; refused if a project links any. */
  UNCATEGORIZE = 'UNCATEGORIZE',
}

export enum ActiveActivitiesAction {
  MOVE = 'MOVE',
  ARCHIVE = 'ARCHIVE',
  /** Leaves them as drafts, which only activities on no project may be. */
  UNCATEGORIZE = 'UNCATEGORIZE',
}

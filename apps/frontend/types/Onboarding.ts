export interface OwnerSetupSteps {
  createTeam: boolean;
  createCategory: boolean;
  createActivity: boolean;
  addProjectActivities: boolean;
  addProjectPeople: boolean;
}

export interface OwnerManagerSteps {
  inviteManager: boolean;
  managerJoined: boolean;
  assignManager: boolean;
}

export interface OwnerSetupState {
  role: "OWNER";
  steps: OwnerSetupSteps;
  managerSteps: OwnerManagerSteps;
  setupProjectId: string | null;
  /** Completed or skipped; once true it stays true. */
  setupFinished: boolean;
}

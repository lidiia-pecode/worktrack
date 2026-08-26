export interface OwnerSetupSteps {
  createTeam: boolean;
  inviteManager: boolean;
  managerJoined: boolean;
  assignManager: boolean;
}

export interface OwnerSetupState {
  role: "OWNER";
  steps: OwnerSetupSteps;
  setupComplete: boolean;
}

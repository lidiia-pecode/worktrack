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

export interface ManagerSetupState {
  role: "MANAGER";
  steps: ManagerSetupSteps;
  setupComplete: boolean;
}

export interface ManagerSetupSteps {
  teamAssigned: boolean;
  inviteMember: boolean;
  memberJoined: boolean;
  addTeamMember: boolean;
  createProject: boolean;
  createActivity: boolean;
  createCategory: boolean;
}

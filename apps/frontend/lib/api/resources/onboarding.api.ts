import { ManagerSetupState, OwnerSetupState } from "@/types/Onboarding";

import { createClient } from "../core";

const client = createClient({
  endpoint: "onboarding",
});

export const OnboardingClientApi = {
  getOwnerSetupState: () => client.get<OwnerSetupState>("/owner/setup-state"),

  getManagerSetupState: () =>
    client.get<ManagerSetupState>("/manager/setup-state"),
};

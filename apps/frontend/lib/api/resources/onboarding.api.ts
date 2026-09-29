import { OwnerSetupState } from "@/types/Onboarding";

import { createClient } from "../core";

const client = createClient({
  endpoint: "onboarding",
});

export const OnboardingClientApi = {
  getOwnerSetupState: () => client.get<OwnerSetupState>("/owner/setup-state"),

  skipOwnerSetup: () => client.post<OwnerSetupState>("/owner/skip"),
};

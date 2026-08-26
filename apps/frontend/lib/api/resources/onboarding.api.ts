import { OwnerSetupState } from "@/types/Onboarding";
import { createClient } from "../core";

const client = createClient({ endpoint: "onboarding" });

export const OnboardingClientApi = {
  getOwnerSetupState: () => client.get<OwnerSetupState>("/setup-state"),
};

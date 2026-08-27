"use client";

import { useQuery } from "@tanstack/react-query";

import { OnboardingClientApi } from "@/lib/api/resources/onboarding.api";

import { queryKeys } from "./shared/queryKeys";

export function useOwnerSetupState() {
  return useQuery({
    queryKey: queryKeys.onboarding.ownerSetup(),
    queryFn: OnboardingClientApi.getOwnerSetupState,
  });
}

export function useManagerSetupState() {
  return useQuery({
    queryKey: queryKeys.onboarding.managerSetup(),
    queryFn: OnboardingClientApi.getManagerSetupState,
  });
}

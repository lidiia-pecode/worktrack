"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { OnboardingClientApi } from "@/lib/api/resources/onboarding.api";
import { queryKeys } from "../shared/queryKeys";

export function useOwnerSetupState() {
  return useQuery({
    queryKey: queryKeys.onboarding.ownerSetup(),
    queryFn: OnboardingClientApi.getOwnerSetupState,
  });
}

export function useSkipOwnerSetup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: OnboardingClientApi.skipOwnerSetup,
    onSuccess: (state) =>
      queryClient.setQueryData(queryKeys.onboarding.ownerSetup(), state),
  });
}

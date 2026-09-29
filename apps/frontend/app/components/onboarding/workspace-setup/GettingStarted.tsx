"use client";

import { useOwnerSetupState } from "@/hooks/auth/useOnboarding";

import { ErrorState } from "../../shared/ErrorState";
import { SetupChecklist } from "./SetupChecklist";
import { SetupGuide } from "./SetupGuide";
import { SetupSkeleton } from "./SetupSkeleton";

/** The one-time setup checklist until setup is finished, then a lasting guide. */
export const GettingStarted = () => {
  const { data, isLoading, isError, refetch } = useOwnerSetupState();

  if (isLoading) {
    return <SetupSkeleton />;
  }

  if (isError || !data) {
    return (
      <ErrorState
        title="Getting started could not be loaded"
        description="We couldn't check what is already set up. Try again in a moment."
        onRetry={() => refetch()}
        className="w-full max-w-3xl"
      />
    );
  }

  return data.setupFinished ? (
    <SetupGuide
      isRequiredSetupDone={Object.values(data.steps).every(Boolean)}
    />
  ) : (
    <SetupChecklist state={data} />
  );
};

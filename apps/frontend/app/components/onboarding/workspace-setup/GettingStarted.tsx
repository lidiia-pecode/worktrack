"use client";

import { useOwnerSetupState } from "@/hooks/auth/useOnboarding";

import { ErrorState } from "../../shared/ErrorState";
import { PageHeader } from "../../shared/PageHeader";
import { SetupChecklist } from "./SetupChecklist";
import { SetupGuide } from "./SetupGuide";
import { SetupSkeleton } from "./SetupSkeleton";

export const GettingStarted = () => {
  const { data, isFetchedAfterMount, isError, refetch } = useOwnerSetupState();

  if (!isFetchedAfterMount && !isError) {
    return <SetupSkeleton />;
  }

  if (isError || !data) {
    return (
      <section className="w-full max-w-3xl">
        <PageHeader title="Getting started" />
        <ErrorState
          title="Getting started could not be loaded"
          description="We couldn't check what is already set up. Try again in a moment."
          onRetry={() => refetch()}
        />
      </section>
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

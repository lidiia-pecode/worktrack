"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import Input from "@/components/ui/input";
import { useCompany } from "@/hooks/auth/useCompany";
import { getErrorMessage } from "@/lib/api/errors/api-error";
import { WEEK_START_OPTIONS } from "@/lib/constants";
import {
  CompanyFormValues,
  companySchema,
} from "@/lib/forms/schemas/company.schema";
import { browserTimeZone, toListedTimeZone } from "@/lib/utils/time-zones";

import { ErrorState } from "../../shared/ErrorState";
import { FormSelect } from "../../shared/FormSelect";
import { TimeZoneSelect } from "../../shared/TimeZoneSelect";
import { OnboardingProgress } from "./OnboardingProgress";
import { OnboardingStepHeader } from "./OnboardingStepHeader";
import { StepActions } from "./StepActions";

const setupSchema = companySchema.pick({
  timezone: true,
  weekStartDay: true,
  standardWorkHoursPerDay: true,
});

type SetupValues = Pick<
  CompanyFormValues,
  "timezone" | "weekStartDay" | "standardWorkHoursPerDay"
>;

const STEPS = [
  {
    label: "Time zone",
    field: "timezone",
    title: "Where is your company?",
    description:
      "Its time zone decides when a day ends, so days are counted and months lock at the right time.",
  },
  {
    label: "Week",
    field: "weekStartDay",
    title: "When does your week start?",
    description: "Timesheets, plans and reports show weeks from this day.",
  },
  {
    label: "Working day",
    field: "standardWorkHoursPerDay",
    title: "How long is a working day?",
    description:
      "The standard day sets everyone's expected hours until you give someone their own.",
  },
] as const;

export const CompanySetupWizard = () => {
  const router = useRouter();
  const { company, query, actions } = useCompany({
    showsSaveErrorInline: true,
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);

  const {
    control,
    register,
    reset,
    trigger,
    handleSubmit,
    formState: { errors },
  } = useForm<SetupValues>({
    resolver: zodResolver(setupSchema),
  });

  useEffect(() => {
    if (!company) return;

    reset({
      timezone:
        browserTimeZone() ??
        toListedTimeZone(company.timezone) ??
        company.timezone,
      weekStartDay: company.weekStartDay,
      standardWorkHoursPerDay: Number(company.standardWorkHoursPerDay),
    });
  }, [company, reset]);

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;
  const isSaving = actions.update.isPending;

  const leaveSetup = () => {
    router.replace("/");
    router.refresh();
  };

  const finish = async (values: SetupValues) => {
    setSaveError(null);

    try {
      await actions.update.mutateAsync(values);
      leaveSetup();
    } catch (error) {
      setSaveError(getErrorMessage(error));
    }
  };

  const continueOrFinish = async () => {
    if (isLastStep) {
      await handleSubmit(finish)();
      return;
    }

    if (await trigger(step.field)) {
      setCurrentStep((index) => index + 1);
    }
  };

  if (query.isLoading) {
    return (
      <p className="animate-pulse text-sm font-medium text-muted-foreground">
        Loading your company...
      </p>
    );
  }

  if (query.isError || !company) {
    return (
      <ErrorState
        title="Your company could not be loaded"
        description="We couldn't load your company's settings. Try again in a moment."
        onRetry={() => query.refetch()}
      />
    );
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Set up {company.companyName}
        </h1>

        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Three questions, saved together at the end. You can change them later
          in Settings.
        </p>
      </div>

      <OnboardingProgress
        steps={STEPS.map(({ label }) => label)}
        currentStep={currentStep}
      />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void continueOrFinish();
        }}
        className="mt-8 space-y-6 rounded-2xl border border-border bg-card p-7 shadow-sm sm:p-8"
      >
        <OnboardingStepHeader
          title={step.title}
          description={step.description}
        />

        {step.field === "timezone" && (
          <Controller
            name="timezone"
            control={control}
            render={({ field }) => (
              <TimeZoneSelect
                value={field.value ?? ""}
                onValueChange={field.onChange}
                error={errors.timezone?.message}
                description="Preselected from this browser."
                disabled={isSaving}
              />
            )}
          />
        )}

        {step.field === "weekStartDay" && (
          <Controller
            name="weekStartDay"
            control={control}
            render={({ field }) => (
              <FormSelect
                id="weekStartDay"
                label="Week starts on"
                value={field.value}
                options={WEEK_START_OPTIONS}
                error={errors.weekStartDay?.message}
                onValueChange={field.onChange}
                disabled={isSaving}
              />
            )}
          />
        )}

        {step.field === "standardWorkHoursPerDay" && (
          <Input
            label="Hours in a working day"
            type="number"
            min={1}
            max={24}
            step={0.5}
            {...register("standardWorkHoursPerDay", { valueAsNumber: true })}
            error={errors.standardWorkHoursPerDay?.message}
            labelClassname="mb-1.5"
            disabled={isSaving}
          />
        )}

        {saveError && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/20 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive-text"
          >
            Could not save your company settings: {saveError}
          </p>
        )}

        <StepActions
          showBack={currentStep > 0}
          onBack={() => setCurrentStep((index) => index - 1)}
          onSkip={leaveSetup}
          isPending={isSaving}
          submitLabel={isLastStep ? "Finish" : "Continue"}
        />
      </form>
    </div>
  );
};

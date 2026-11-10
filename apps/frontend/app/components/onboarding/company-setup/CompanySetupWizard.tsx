"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/auth/useAuth";
import { useCompany } from "@/hooks/auth/useCompany";
import { queryKeys } from "@/hooks/shared/queryKeys";
import {
  useRefreshAfterCapacityChange,
  useUserCapacity,
} from "@/hooks/useCapacity";
import { getErrorMessage } from "@/lib/api/errors/api-error";
import { CapacityClientApi, CompaniesClientApi } from "@/lib/api/resources";
import { WEEK_START_OPTIONS } from "@/lib/constants";
import { companySchema } from "@/lib/forms/schemas/company.schema";
import { todayISODate } from "@/lib/utils/date";
import { browserTimeZone, toListedTimeZone } from "@/lib/utils/time-zones";

import { ErrorState } from "../../shared/ErrorState";
import { LoadingState } from "../../shared/LoadingState";
import { FormSelect } from "../../shared/FormSelect";
import { TimeZoneSelect } from "../../shared/TimeZoneSelect";
import { OnboardingProgress } from "./OnboardingProgress";
import { OnboardingStepHeader } from "./OnboardingStepHeader";
import { FormAlert } from "../../shared/FormAlert";
import { OptionCards } from "../../shared/inputs/OptionCards";
import { minutesPerWeekOf } from "@/lib/forms/schemas/work-day.schema";
import {
  STANDARD_DAY_LABEL,
  STANDARD_DAY_NOTE,
  WorkDayHoursInput,
} from "../../shared/inputs/WorkDayHoursInput";

const setupSchema = companySchema
  .pick({
    timezone: true,
    weekStartDay: true,
    standardWorkHoursPerDay: true,
  })
  .extend({ logsOwnTime: z.enum(["yes", "no"]) });

type SetupValues = z.infer<typeof setupSchema>;

const OWN_TIME_OPTIONS = [
  {
    value: "yes" as const,
    label: "Yes, I log my time",
    description: "You're expected the standard day, like everyone else.",
  },
  {
    value: "no" as const,
    label: "No, I don't",
    description: "No fixed hours: nothing is expected, no missing days.",
  },
];

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
  {
    label: "Your time",
    field: "logsOwnTime",
    title: "Do you log your own time?",
    description:
      "Your expected hours come from this. You can change it later on your own panel in People.",
  },
] as const;

type SetupField = (typeof STEPS)[number]["field"];

// Every company starts in UTC (set at sign-up), never a zone someone chose.
const DEFAULT_TIME_ZONE = "UTC";

export const CompanySetupWizard = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const refreshCapacity = useRefreshAfterCapacityChange();
  const { user } = useAuth();
  const { company, query, actions } = useCompany({
    showsSaveErrorInline: true,
  });
  const ownCapacity = useUserCapacity(user?.id ?? "", Boolean(user));
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const {
    control,
    reset,
    trigger,
    getValues,
    handleSubmit,
    formState: { errors },
  } = useForm<SetupValues>({
    resolver: zodResolver(setupSchema),
  });

  const ownMinutesPerWeek = ownCapacity.capacity?.minutesPerWeek;

  useEffect(() => {
    if (!company || ownMinutesPerWeek === undefined) return;

    reset({
      // A company still on UTC, as every one starts, has never chosen a zone,
      // so the browser's is the better guess; a chosen one stays.
      timezone:
        (company.timezone === DEFAULT_TIME_ZONE && browserTimeZone()) ||
        toListedTimeZone(company.timezone) ||
        company.timezone,
      weekStartDay: company.weekStartDay,
      standardWorkHoursPerDay: Number(company.standardWorkHoursPerDay),
      logsOwnTime: ownMinutesPerWeek === 0 ? "no" : "yes",
    });
  }, [company, ownMinutesPerWeek, reset]);

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;

  const leaveSetup = () => {
    router.replace("/");
    router.refresh();
  };

  /**
   * Saves the answered questions as Settings and the person's panel do, from
   * today where the company now is: at sign-up that is the company's first
   * day, and opened again later it changes nothing before today. The time
   * zone is always saved, since the one shown beats the UTC every company
   * starts in.
   */
  const save = async (
    {
      timezone,
      weekStartDay,
      standardWorkHoursPerDay,
      logsOwnTime,
    }: SetupValues,
    answered: SetupField[],
  ) => {
    if (!company || !user || ownMinutesPerWeek === undefined) return;
    setSaveError(null);
    setIsSaving(true);

    try {
      const saved = await actions.update.mutateAsync({
        timezone,
        ...(answered.includes("weekStartDay") && { weekStartDay }),
      });
      const today = todayISODate(saved.timezone);

      if (
        answered.includes("standardWorkHoursPerDay") &&
        standardWorkHoursPerDay !== Number(company.standardWorkHoursPerDay)
      ) {
        await CompaniesClientApi.setStandardDay({
          hoursPerDay: standardWorkHoursPerDay,
          validFrom: today,
        });
      }
      // Only a changed answer is saved: "Yes" keeps the hours they have,
      // and gives the standard day only to an owner at 0h.
      const answeredNo = logsOwnTime === "no";
      if (
        answered.includes("logsOwnTime") &&
        answeredNo !== (ownMinutesPerWeek === 0)
      ) {
        await CapacityClientApi.setForUser({
          userId: user.id,
          minutesPerWeek: answeredNo
            ? 0
            : minutesPerWeekOf(standardWorkHoursPerDay),
          validFrom: today,
        });
      }

      void queryClient.invalidateQueries({
        queryKey: queryKeys.company.current,
      });
      refreshCapacity();
      leaveSetup();
    } catch (error) {
      setSaveError(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const finish = (values: SetupValues) =>
    save(
      values,
      STEPS.map((setupStep) => setupStep.field),
    );

  // The questions passed with Next are kept; the time zone always is.
  const skipRest = () =>
    save(
      getValues(),
      STEPS.slice(0, currentStep).map((setupStep) => setupStep.field),
    );

  const continueOrFinish = async () => {
    if (isLastStep) {
      await handleSubmit(finish)();
      return;
    }

    if (await trigger(step.field)) {
      setCurrentStep((index) => index + 1);
    }
  };

  if (query.isLoading || !user || ownCapacity.isLoading) {
    return <LoadingState size="compact" title="Loading your company..." />;
  }

  if (query.isError || ownCapacity.isError || !company) {
    return (
      <ErrorState
        title="Your company could not be loaded"
        description="We couldn't load your company's settings. Try again in a moment."
        onRetry={() => {
          void query.refetch();
          void ownCapacity.refetch();
        }}
      />
    );
  }

  return (
    <div className="flex w-full flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Set up {company.companyName}
        </h1>

        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Four questions, asked once. Skipping keeps the answers you have given
          and your time zone. You can change them later in Settings and on your
          own panel in People.
        </p>
      </div>

      <OnboardingProgress
        steps={STEPS.map(({ label }) => label)}
        currentStep={currentStep}
      />

      <Card>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void continueOrFinish();
          }}
          className="space-y-6 p-7 sm:p-8"
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
            <Controller
              control={control}
              name="standardWorkHoursPerDay"
              render={({ field, fieldState }) => (
                <WorkDayHoursInput
                  {...field}
                  label={STANDARD_DAY_LABEL}
                  note={STANDARD_DAY_NOTE}
                  min={1}
                  error={fieldState.error?.message}
                  disabled={isSaving}
                />
              )}
            />
          )}

          {step.field === "logsOwnTime" && (
            <Controller
              name="logsOwnTime"
              control={control}
              render={({ field }) => (
                <OptionCards
                  name="logsOwnTime"
                  value={field.value}
                  options={OWN_TIME_OPTIONS}
                  onChange={field.onChange}
                  disabled={isSaving}
                />
              )}
            />
          )}

          {saveError && (
            <FormAlert>
              Could not save your company settings: {saveError}
            </FormAlert>
          )}

          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCurrentStep((index) => index - 1)}
                disabled={isSaving}
              >
                <ChevronLeft className="size-4" />
                Back
              </Button>
            )}

            <Button
              type="submit"
              className="flex-1"
              disabled={isSaving}
              isLoading={isSaving}
            >
              {isLastStep ? "Finish" : "Continue"}
            </Button>
          </div>
        </form>
      </Card>

      <Button
        type="button"
        variant="pastel"
        size="sm"
        className="self-end"
        onClick={() => void skipRest()}
        disabled={isSaving}
      >
        Skip the rest
      </Button>
    </div>
  );
};

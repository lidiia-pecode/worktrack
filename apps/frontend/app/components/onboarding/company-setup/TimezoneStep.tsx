"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useCompany } from "@/hooks/useCompany";
import {
  CompanyFormValues,
  companySchema,
} from "@/lib/forms/schemas/company.schema";
import { OnboardingStepHeader } from "./OnboardingStepHeader";
import { StepActions } from "./StepActions";

const TIMEZONES = [
  { label: "UTC", value: "UTC" },
  { label: "Europe/Kyiv", value: "Europe/Kyiv" },
  { label: "Europe/London", value: "Europe/London" },
  { label: "America/New_York", value: "America/New_York" },
] as const;

interface StepProps {
  onContinue: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export function TimezoneStep({ onContinue, onBack, onSkip }: StepProps) {
  const { company, actions } = useCompany();
  const isPending = actions.update.isPending;

  const {
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<Pick<CompanyFormValues, "timezone">>({
    resolver: zodResolver(companySchema.pick({ timezone: true })),
    defaultValues: {
      timezone: "UTC",
    },
  });

  useEffect(() => {
    if (!company) return;

    reset({
      timezone: company.timezone ?? "UTC",
    });
  }, [company, reset]);

  const onSubmit = async (data: Pick<CompanyFormValues, "timezone">) => {
    await actions.update.mutateAsync(data);
    onContinue();
  };

  return (
    <div className="space-y-6">
      <OnboardingStepHeader
        title="Choose your timezone"
        description="Ensure accurate time tracking and reporting across your workspace."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            Timezone
          </label>

          <select
            {...register("timezone")}
            disabled={isPending}
            className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {TIMEZONES.map((timezone) => (
              <option key={timezone.value} value={timezone.value}>
                {timezone.label}
              </option>
            ))}
          </select>

          {errors.timezone && (
            <p className="text-xs font-medium text-destructive">
              {errors.timezone.message}
            </p>
          )}
        </div>

        <StepActions onBack={onBack} onSkip={onSkip} isPending={isPending} />
      </form>
    </div>
  );
}

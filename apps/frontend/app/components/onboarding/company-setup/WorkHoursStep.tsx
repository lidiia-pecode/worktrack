"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useCompany } from "@/hooks/useCompany";
import Input from "@/components/ui/input";
import {
  CompanyFormValues,
  companySchema,
} from "@/lib/forms/schemas/company.schema";
import { OnboardingStepHeader } from "./OnboardingStepHeader";
import { StepActions } from "./StepActions";

interface StepProps {
  onContinue: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export function WorkHoursStep({ onContinue, onBack, onSkip }: StepProps) {
  const { company, actions } = useCompany();
  const isPending = actions.update.isPending;

  const {
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<Pick<CompanyFormValues, "standardWorkHoursPerDay">>({
    resolver: zodResolver(
      companySchema.pick({
        standardWorkHoursPerDay: true,
      }),
    ),
    defaultValues: {
      standardWorkHoursPerDay: 8,
    },
  });

  useEffect(() => {
    if (!company) return;

    reset({
      standardWorkHoursPerDay: company.standardWorkHoursPerDay ?? 8,
    });
  }, [company, reset]);

  const onSubmit = async (
    data: Pick<CompanyFormValues, "standardWorkHoursPerDay">,
  ) => {
    await actions.update.mutateAsync(data);
    onContinue();
  };

  return (
    <div className="space-y-6">
      <OnboardingStepHeader
        title="Standard work hours"
        description="Define standard hours per day to calculate capacity and utilization correctly."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Working hours per day"
          type="number"
          min={1}
          max={24}
          {...register("standardWorkHoursPerDay", {
            valueAsNumber: true,
          })}
          error={errors.standardWorkHoursPerDay?.message}
          disabled={isPending}
        />

        <StepActions onBack={onBack} onSkip={onSkip} isPending={isPending} />
      </form>
    </div>
  );
}

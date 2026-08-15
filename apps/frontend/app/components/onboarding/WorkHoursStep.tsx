"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCompany } from "@/hooks/useCompany";

import Input from "@/app/components/shared/Input";
import { StepActions } from "./StepActions";
import {
  CompanyFormValues,
  companySchema,
} from "@/lib/forms/schemas/company.schema";

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
    handleSubmit,
    formState: { errors },
  } = useForm<Pick<CompanyFormValues, "standardWorkHoursPerDay">>({
    resolver: zodResolver(
      companySchema.pick({ standardWorkHoursPerDay: true }),
    ),
    defaultValues: {
      standardWorkHoursPerDay: company?.standardWorkHoursPerDay || 8,
    },
  });

  const onSubmit = async (
    data: Pick<CompanyFormValues, "standardWorkHoursPerDay">,
  ) => {
    await actions.update.mutateAsync(data);
    onContinue();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Standard work hours
        </h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          Define standard hours per day to calculate capacity and utilization
          correctly.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Working hours per day"
          type="number"
          min={1}
          max={24}
          {...register("standardWorkHoursPerDay", { valueAsNumber: true })}
          error={errors.standardWorkHoursPerDay?.message}
          disabled={isPending}
        />

        <StepActions onBack={onBack} onSkip={onSkip} isPending={isPending} />
      </form>
    </div>
  );
}

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCompany } from "@/hooks/useCompany";
import {
  updateCompanySchema,
  UpdateCompanyInputs,
} from "@/lib/forms/schemas/workspace.schema";
import Input from "@/app/components/shared/Input";
import Button from "@/app/components/shared/Button";

interface StepProps {
  onContinue: () => void;
  onBack: () => void;
}

export function WorkHoursStep({ onContinue, onBack }: StepProps) {
  const { company, actions } = useCompany();
  const isPending = actions.update.isPending;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Pick<UpdateCompanyInputs, "standardWorkHoursPerDay">>({
    resolver: zodResolver(
      updateCompanySchema.pick({ standardWorkHoursPerDay: true }),
    ),
    defaultValues: {
      standardWorkHoursPerDay: company?.standardWorkHoursPerDay || 8,
    },
  });

  const onSubmit = async (
    data: Pick<UpdateCompanyInputs, "standardWorkHoursPerDay">,
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

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onBack}
            disabled={isPending}
            className="w-1/3"
          >
            Back
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            isLoading={isPending}
            className="w-2/3"
          >
            Complete Setup
          </Button>
        </div>
      </form>
    </div>
  );
}

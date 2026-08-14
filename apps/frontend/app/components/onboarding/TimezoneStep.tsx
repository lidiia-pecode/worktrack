"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCompany } from "@/hooks/useCompany";
import {
  updateCompanySchema,
  UpdateCompanyInputs,
} from "@/lib/forms/schemas/workspace.schema";
import Button from "@/app/components/shared/Button";

const TIMEZONES = [
  { label: "UTC", value: "UTC" },
  { label: "Europe/Kyiv", value: "Europe/Kyiv" },
  { label: "Europe/London", value: "Europe/London" },
  { label: "America/New_York", value: "America/New_York" },
] as const;

interface StepProps {
  onContinue: () => void;
  onBack: () => void;
}

export function TimezoneStep({ onContinue, onBack }: StepProps) {
  const { company, actions } = useCompany();
  const isPending = actions.update.isPending;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Pick<UpdateCompanyInputs, "timezone">>({
    resolver: zodResolver(updateCompanySchema.pick({ timezone: true })),
    defaultValues: { timezone: company?.timezone || "UTC" },
  });

  const onSubmit = async (data: Pick<UpdateCompanyInputs, "timezone">) => {
    await actions.update.mutateAsync(data);
    onContinue();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Choose your timezone
        </h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          Ensure accurate time tracking and reporting across your workspace.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-900 dark:text-white">
            Timezone
          </label>
          <select
            {...register("timezone")}
            disabled={isPending}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
          {errors.timezone && (
            <p className="text-xs text-red-500 font-medium mt-1">
              {errors.timezone.message}
            </p>
          )}
        </div>

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
            Continue
          </Button>
        </div>
      </form>
    </div>
  );
}

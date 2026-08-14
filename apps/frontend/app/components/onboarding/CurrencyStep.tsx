"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCompany } from "@/hooks/useCompany";
import {
  updateCompanySchema,
  UpdateCompanyInputs,
} from "@/lib/forms/schemas/workspace.schema";
import Button from "@/app/components/shared/Button";

const CURRENCIES = [
  { label: "USD ($)", value: "USD" },
  { label: "EUR (€)", value: "EUR" },
  { label: "GBP (£)", value: "GBP" },
  { label: "UAH (₴)", value: "UAH" },
] as const;

interface StepProps {
  onContinue: () => void;
  onBack: () => void;
}

export function CurrencyStep({ onContinue, onBack }: StepProps) {
  const { company, actions } = useCompany();
  const isPending = actions.update.isPending;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Pick<UpdateCompanyInputs, "currency">>({
    resolver: zodResolver(updateCompanySchema.pick({ currency: true })),
    defaultValues: { currency: company?.currency || "USD" },
  });

  const onSubmit = async (data: Pick<UpdateCompanyInputs, "currency">) => {
    await actions.update.mutateAsync(data);
    onContinue();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Select primary currency
        </h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          Used for project costing, billing, and financial summaries.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-900 dark:text-white">
            Currency
          </label>
          <select
            {...register("currency")}
            disabled={isPending}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50"
          >
            {CURRENCIES.map((cur) => (
              <option key={cur.value} value={cur.value}>
                {cur.label}
              </option>
            ))}
          </select>
          {errors.currency && (
            <p className="text-xs text-red-500 font-medium mt-1">
              {errors.currency.message}
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

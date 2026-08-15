"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCompany } from "@/hooks/useCompany";

import { StepActions } from "./StepActions";
import {
  CompanyFormValues,
  companySchema,
} from "@/lib/forms/schemas/company.schema";

const CURRENCIES = [
  { label: "USD ($)", value: "USD" },
  { label: "EUR (€)", value: "EUR" },
  { label: "GBP (£)", value: "GBP" },
  { label: "UAH (₴)", value: "UAH" },
] as const;

interface StepProps {
  onContinue: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export const CurrencyStep = ({ onContinue, onBack, onSkip }: StepProps) => {
  const { company, actions } = useCompany();
  const isPending = actions.update.isPending;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Pick<CompanyFormValues, "currency">>({
    resolver: zodResolver(companySchema.pick({ currency: true })),
    defaultValues: { currency: company?.currency },
  });

  const onSubmit = async (data: Pick<CompanyFormValues, "currency">) => {
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

        <StepActions onBack={onBack} onSkip={onSkip} isPending={isPending} />
      </form>
    </div>
  );
};

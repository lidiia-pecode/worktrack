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
import { CompanyCurrency } from "@/types/enums";

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

export function CurrencyStep({ onContinue, onBack, onSkip }: StepProps) {
  const { company, actions } = useCompany();
  const isPending = actions.update.isPending;

  const {
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<Pick<CompanyFormValues, "currency">>({
    resolver: zodResolver(companySchema.pick({ currency: true })),
    defaultValues: {
      currency: CompanyCurrency.USD,
    },
  });

  useEffect(() => {
    if (!company) return;

    reset({
      currency: company.currency ?? "USD",
    });
  }, [company, reset]);

  const onSubmit = async (data: Pick<CompanyFormValues, "currency">) => {
    await actions.update.mutateAsync(data);
    onContinue();
  };

  return (
    <div className="space-y-6">
      <OnboardingStepHeader
        title="Select primary currency"
        description="Used for project costing, billing, and financial summaries."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            Currency
          </label>

          <select
            {...register("currency")}
            disabled={isPending}
            className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {CURRENCIES.map((currency) => (
              <option key={currency.value} value={currency.value}>
                {currency.label}
              </option>
            ))}
          </select>

          {errors.currency && (
            <p className="text-xs font-medium text-destructive">
              {errors.currency.message}
            </p>
          )}
        </div>

        <StepActions onBack={onBack} onSkip={onSkip} isPending={isPending} />
      </form>
    </div>
  );
}

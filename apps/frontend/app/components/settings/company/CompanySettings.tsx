"use client";

import { useEffect } from "react";
import { Building2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  CompanyFormValues,
  companySchema,
} from "@/lib/forms/schemas/company.schema";

import { SettingsSection } from "../components/SettingsSection";
import { SettingsSectionHeader } from "../components/SettingsSectionHeader";
import { SettingsActions } from "../components/SettingsActions";
import Input from "../../../../components/ui/input";
import { FormSelect } from "../../shared/FormSelect";

import { CompanyCurrency, WeekDay } from "@/types/enums";
import {
  settingsLabelClassName,
  settingsNumberInputClassName,
} from "../styles/settings-styles";
import { NumberInputControls } from "../components/NumberInputControls";
import { useCompany } from "@/hooks/auth/useCompany";
import { TIMEZONE_OPTIONS } from "@/lib/constants";

const CURRENCY_OPTIONS = [
  { value: CompanyCurrency.USD, label: "USD" },
  { value: CompanyCurrency.EUR, label: "EUR" },
  { value: CompanyCurrency.UAH, label: "UAH" },
  { value: CompanyCurrency.GBP, label: "GBP" },
];

const WEEK_START_OPTIONS = [
  { value: WeekDay.MONDAY, label: "Monday" },
  { value: WeekDay.SUNDAY, label: "Sunday" },
];

export const CompanySettings = () => {
  const { company, actions } = useCompany();

  const {
    register,
    control,
    reset,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      companyName: "",
      timezone: "",
      currency: CompanyCurrency.USD,
      weekStartDay: WeekDay.MONDAY,
      standardWorkHoursPerDay: 0,
    },
  });

  useEffect(() => {
    if (!company) return;

    reset({
      companyName: company.companyName ?? "",
      timezone: company.timezone ?? "",
      currency: company.currency ?? CompanyCurrency.USD,
      weekStartDay: company.weekStartDay ?? WeekDay.MONDAY,
      standardWorkHoursPerDay: company.standardWorkHoursPerDay ?? 0,
    });
  }, [company, reset]);

  const updateWorkHours = (delta: number) => {
    const current = Number(getValues("standardWorkHoursPerDay")) || 0;

    const next = Math.min(24, Math.max(1, current + delta));

    setValue("standardWorkHoursPerDay", next, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const onSubmit = async (data: CompanyFormValues) => {
    await actions.update.mutateAsync(data);
  };

  return (
    <SettingsSection>
      <SettingsSectionHeader
        icon={Building2}
        title="Company settings"
        description="Manage your company and workspace preferences."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 p-6">
        <section>
          <div className="mt-4">
            <Input
              label="Company name"
              placeholder="Your company name"
              {...register("companyName")}
              error={errors.companyName?.message}
              labelClassname={settingsLabelClassName}
            />
          </div>
        </section>

        <div className="border-t border-border" />

        <section>
          <h3 className="font-semibold text-foreground">
            Regional preferences
          </h3>

          <p className="mt-1 text-xs text-muted-foreground">
            Configure how dates, times, and currency are handled.
          </p>

          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <Controller
              name="timezone"
              control={control}
              render={({ field }) => (
                <FormSelect
                  id="timezone"
                  label="Timezone"
                  placeholder="Select timezone"
                  value={field.value}
                  options={TIMEZONE_OPTIONS}
                  error={errors.timezone?.message}
                  onValueChange={field.onChange}
                />
              )}
            />

            <Controller
              name="currency"
              control={control}
              render={({ field }) => (
                <FormSelect
                  id="currency"
                  label="Currency"
                  placeholder="Select currency"
                  value={field.value}
                  options={CURRENCY_OPTIONS}
                  error={errors.currency?.message}
                  onValueChange={field.onChange}
                />
              )}
            />

            <Controller
              name="weekStartDay"
              control={control}
              render={({ field }) => (
                <FormSelect
                  id="weekStartDay"
                  label="Week starts on"
                  placeholder="Select day"
                  value={field.value}
                  options={WEEK_START_OPTIONS}
                  error={errors.weekStartDay?.message}
                  onValueChange={field.onChange}
                />
              )}
            />

            <div className="relative">
              <Input
                label="Standard work hours / day"
                type="number"
                min={1}
                max={24}
                step={0.5}
                placeholder="8"
                {...register("standardWorkHoursPerDay", {
                  valueAsNumber: true,
                })}
                error={errors.standardWorkHoursPerDay?.message}
                className={settingsNumberInputClassName}
                labelClassname={settingsLabelClassName}
              />

              <NumberInputControls
                onIncrement={() => updateWorkHours(0.5)}
                onDecrement={() => updateWorkHours(-0.5)}
              />
            </div>
          </div>
        </section>

        <SettingsActions>
          <Button
            type="submit"
            variant="primary"
            disabled={!isDirty || isSubmitting || actions.update.isPending}
          >
            {isSubmitting || actions.update.isPending
              ? "Saving..."
              : "Save changes"}
          </Button>
        </SettingsActions>
      </form>
    </SettingsSection>
  );
};

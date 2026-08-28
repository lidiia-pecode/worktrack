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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { SettingsSection } from "../components/SettingsSection";
import { SettingsSectionHeader } from "../components/SettingsSectionHeader";
import { SettingsActions } from "../components/SettingsActions";
import { SettingsField } from "../components/SettingsField";
import Input from "../../../../components/ui/input";

import { CompanyCurrency, WeekDay } from "@/types/enums";
import {
  settingsFieldClassName,
  settingsInputClassName,
  settingsLabelClassName,
  settingsNumberInputClassName,
  settingsSelectContentClassName,
  settingsSelectItemClassName,
} from "../styles/settings-styles";
import { NumberInputControls } from "../components/NumberInputControls";
import { useCompany } from "@/hooks/auth/useCompany";

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
              className={settingsInputClassName}
              labelClassname={settingsLabelClassName}
            />
          </div>
        </section>

        <div className="border-t border-blue-400/20" />

        <section>
          <h3 className="font-semibold text-slate-400">Regional preferences</h3>

          <p className="mt-1 text-xs text-slate-500">
            Configure how dates, times, and currency are handled.
          </p>

          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <Controller
              name="timezone"
              control={control}
              render={({ field }) => (
                <SettingsField
                  label="Timezone"
                  htmlFor="timezone"
                  error={errors.timezone?.message}
                >
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="timezone"
                      className={settingsFieldClassName}
                      aria-invalid={!!errors.timezone}
                    >
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>

                    <SelectContent className={settingsSelectContentClassName}>
                      <SelectItem
                        value="UTC"
                        className={settingsSelectItemClassName}
                      >
                        UTC
                      </SelectItem>

                      <SelectItem
                        value="Europe/Kyiv"
                        className={settingsSelectItemClassName}
                      >
                        Europe/Kyiv
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </SettingsField>
              )}
            />

            <Controller
              name="currency"
              control={control}
              render={({ field }) => (
                <SettingsField
                  label="Currency"
                  htmlFor="currency"
                  error={errors.currency?.message}
                >
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="currency"
                      className={settingsFieldClassName}
                      aria-invalid={!!errors.currency}
                    >
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>

                    <SelectContent className={settingsSelectContentClassName}>
                      <SelectItem
                        value={CompanyCurrency.USD}
                        className={settingsSelectItemClassName}
                      >
                        USD
                      </SelectItem>
                      <SelectItem
                        value={CompanyCurrency.EUR}
                        className={settingsSelectItemClassName}
                      >
                        EUR
                      </SelectItem>
                      <SelectItem
                        value={CompanyCurrency.UAH}
                        className={settingsSelectItemClassName}
                      >
                        UAH
                      </SelectItem>
                      <SelectItem
                        value={CompanyCurrency.GBP}
                        className={settingsSelectItemClassName}
                      >
                        GBP
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </SettingsField>
              )}
            />

            <Controller
              name="weekStartDay"
              control={control}
              render={({ field }) => (
                <SettingsField
                  label="Week starts on"
                  htmlFor="weekStartDay"
                  error={errors.weekStartDay?.message}
                >
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="weekStartDay"
                      className={settingsFieldClassName}
                      aria-invalid={!!errors.weekStartDay}
                    >
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>

                    <SelectContent className={settingsSelectContentClassName}>
                      <SelectItem
                        value={WeekDay.MONDAY}
                        className={settingsSelectItemClassName}
                      >
                        Monday
                      </SelectItem>
                      <SelectItem
                        value={WeekDay.SUNDAY}
                        className={settingsSelectItemClassName}
                      >
                        Sunday
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </SettingsField>
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

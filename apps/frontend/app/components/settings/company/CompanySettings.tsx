"use client";

import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import {
  CompanyFormValues,
  companySchema,
} from "@/lib/forms/schemas/company.schema";

import Input from "../../../../components/ui/input";
import { ConfirmModal } from "../../shared/ConfirmModal";
import { FormSelect } from "../../shared/FormSelect";
import { TimeZoneSelect } from "../../shared/TimeZoneSelect";

import { WeekDay } from "@/types/enums";
import { WEEK_START_OPTIONS } from "@/lib/constants";
import { toListedTimeZone } from "@/lib/utils/time-zones";
import { settingsNumberInputClassName } from "../styles/settings-styles";
import { NumberInputControls } from "../components/NumberInputControls";
import { useCompany } from "@/hooks/auth/useCompany";
import { useReportDirty } from "@/hooks/useReportDirty";

interface CompanySettingsProps {
  onDirtyChange?: (isDirty: boolean) => void;
}

export const CompanySettings = ({ onDirtyChange }: CompanySettingsProps) => {
  const { company, actions } = useCompany();

  // A changed standard day is held here until the owner confirms it, since it
  // rewrites Expected for everybody on the default, locked months included.
  const [standardDayChange, setStandardDayChange] =
    useState<CompanyFormValues | null>(null);

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
      weekStartDay: WeekDay.MONDAY,
      standardWorkHoursPerDay: 0,
    },
  });

  useReportDirty(isDirty, onDirtyChange);

  const standardWorkHoursPerDay = useWatch({
    control,
    name: "standardWorkHoursPerDay",
  });

  useEffect(() => {
    if (!company) return;

    reset({
      companyName: company.companyName ?? "",
      timezone: toListedTimeZone(company.timezone) ?? company.timezone ?? "",
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

  const save = (data: CompanyFormValues) => actions.update.mutateAsync(data);

  const onSubmit = async (data: CompanyFormValues) => {
    if (data.standardWorkHoursPerDay !== company?.standardWorkHoursPerDay) {
      setStandardDayChange(data);
      return;
    }

    await save(data);
  };

  const confirmStandardDayChange = async () => {
    if (!standardDayChange) return;

    await save(standardDayChange);
    setStandardDayChange(null);
  };

  return (
    <Card>
      <CardHeader
        icon={Building2}
        title="Company settings"
        description="Manage your company and workspace preferences."
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardBody className="space-y-8">
          <section>
            <div className="mt-4">
              <Input
                label="Company name"
                placeholder="Your company name"
                {...register("companyName")}
                error={errors.companyName?.message}
              />
            </div>
          </section>

          <div className="border-t border-border" />

          <section>
            <h3 className="font-semibold text-foreground">
              Regional preferences
            </h3>

            <p className="mt-1 text-xs text-muted-foreground">
              How the company&apos;s days and weeks are counted.
            </p>

            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <Controller
                name="timezone"
                control={control}
                render={({ field }) => (
                  <TimeZoneSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    error={errors.timezone?.message}
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

              <div>
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
                  />

                  <NumberInputControls
                    onIncrement={() => updateWorkHours(0.5)}
                    onDecrement={() => updateWorkHours(-0.5)}
                  />
                </div>

                {!errors.standardWorkHoursPerDay && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Changing it recalculates Expected hours for everyone on the
                    company&apos;s default hours, past and locked months
                    included.
                  </p>
                )}
              </div>
            </div>
          </section>
        </CardBody>

        <CardFooter>
          <Button
            type="submit"
            variant="primary"
            disabled={!isDirty}
            isLoading={isSubmitting || actions.update.isPending}
          >
            Save changes
          </Button>
        </CardFooter>
      </form>

      <ConfirmModal
        isOpen={standardDayChange !== null}
        title={`Change the standard day to ${standardWorkHoursPerDay}h?`}
        message="Expected hours are recalculated for everyone on the company's default hours, past and locked months included. Reports and the week views change with them."
        confirmText="Save changes"
        variant="warning"
        onConfirm={confirmStandardDayChange}
        onClose={() => setStandardDayChange(null)}
        loading={actions.update.isPending}
      />
    </Card>
  );
};

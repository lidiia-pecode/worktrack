"use client";

import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import {
  CompanyFormValues,
  companySchema,
} from "@/lib/forms/schemas/company.schema";

import Input from "../../../../components/ui/input";
import { ImpactDialog } from "../../shared/ImpactDialog";
import { FormSelect } from "../../shared/FormSelect";
import { TimeZoneSelect } from "../../shared/TimeZoneSelect";

import { Company } from "@/types/Company";
import { WeekDay } from "@/types/enums";
import { WEEK_DAY_LABELS, WEEK_START_OPTIONS } from "@/lib/constants";
import { findTimeZoneOption, toListedTimeZone } from "@/lib/utils/time-zones";
import { settingsNumberInputClassName } from "../styles/settings-styles";
import { NumberInputControls } from "../components/NumberInputControls";
import { useCompany } from "@/hooks/auth/useCompany";
import { useReportDirty } from "@/hooks/useReportDirty";

interface CompanySettingsProps {
  onDirtyChange?: (isDirty: boolean) => void;
}

// The stored zone may be an old alias, so the form shows the listed one; a save
// is compared with these values, so an untouched alias never counts as a change.
const toFormValues = (company: Company): CompanyFormValues => ({
  companyName: company.companyName ?? "",
  timezone: toListedTimeZone(company.timezone) ?? company.timezone ?? "",
  weekStartDay: company.weekStartDay ?? WeekDay.MONDAY,
  standardWorkHoursPerDay: company.standardWorkHoursPerDay ?? 0,
});

interface SettingChange {
  title: string;
  /** Names the change when several are confirmed together. */
  label: string;
  consequence: string;
}

/** The changes that alter how everyone's days, weeks or hours count, so saving asks first. */
const changesToConfirm = (
  next: CompanyFormValues,
  saved: CompanyFormValues,
): SettingChange[] => {
  const changes: SettingChange[] = [];

  if (next.timezone !== saved.timezone) {
    const zone = findTimeZoneOption(next.timezone)?.label ?? next.timezone;
    changes.push({
      title: `Change the time zone to ${zone}?`,
      label: `Time zone to ${zone}`,
      consequence:
        "Time, absences and plans keep their dates. Days start and end on the new zone's clock, so the day someone joined, left or came back can move by one, and their expected hours with it, past and locked months included.",
    });
  }

  if (next.weekStartDay !== saved.weekStartDay) {
    const day = WEEK_DAY_LABELS[next.weekStartDay];
    changes.push({
      title: `Start weeks on ${day}?`,
      label: `Week starts on ${day}`,
      consequence:
        "Weeks regroup on the Log my time, Team time and Planning pages and in the People report's weekly breakdown, and the weekly planning limit counts the new weeks. Nothing saved changes.",
    });
  }

  if (next.standardWorkHoursPerDay !== saved.standardWorkHoursPerDay) {
    changes.push({
      title: `Change the standard day to ${next.standardWorkHoursPerDay}h?`,
      label: `Standard day to ${next.standardWorkHoursPerDay}h`,
      consequence:
        "Expected hours are recalculated for everyone on the company's default hours, past and locked months included. Reports and the week views change with them.",
    });
  }

  return changes;
};

export const CompanySettings = ({ onDirtyChange }: CompanySettingsProps) => {
  const { company, actions } = useCompany();

  // A save that changes how days, weeks or hours count is held here until the
  // owner confirms it, since it reaches everybody, locked months included.
  const [pendingSave, setPendingSave] = useState<{
    values: CompanyFormValues;
    changes: SettingChange[];
  } | null>(null);

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

  useEffect(() => {
    if (!company) return;

    reset(toFormValues(company));
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
    const changes = company
      ? changesToConfirm(data, toFormValues(company))
      : [];
    if (changes.length > 0) {
      setPendingSave({ values: data, changes });
      return;
    }

    await actions.update.mutateAsync(data);
  };

  // A failed save keeps the dialog open; the global handler shows the error.
  const confirmPendingSave = () => {
    if (!pendingSave) return;

    actions.update.mutate(pendingSave.values, {
      onSuccess: () => setPendingSave(null),
    });
  };

  const changes = pendingSave?.changes ?? [];

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

      <ImpactDialog
        isOpen={pendingSave !== null}
        title={
          changes.length === 1
            ? changes[0].title
            : `Change ${changes.length} company settings?`
        }
        description={
          changes.length === 1
            ? changes[0].consequence
            : changes.map((change) => (
                <span key={change.label} className="mt-2 block first:mt-0">
                  <span className="font-medium text-foreground">
                    {change.label}:
                  </span>{" "}
                  {change.consequence}
                </span>
              ))
        }
        confirmText="Save changes"
        confirmVariant="warning"
        onConfirm={confirmPendingSave}
        onClose={() => setPendingSave(null)}
        loading={actions.update.isPending}
      />
    </Card>
  );
};

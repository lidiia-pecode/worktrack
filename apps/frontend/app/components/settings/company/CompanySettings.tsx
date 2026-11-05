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
import { ErrorState } from "../../shared/ErrorState";
import { ImpactDialog } from "../../shared/ImpactDialog";
import { LoadingState } from "../../shared/LoadingState";
import { ScheduledChange } from "../../shared/ScheduledChange";
import { DatePicker } from "../../shared/inputs";
import { FormSelect } from "../../shared/FormSelect";
import { TimeZoneSelect } from "../../shared/TimeZoneSelect";

import { Company, StandardDayChange } from "@/types/Company";
import { WeekDay } from "@/types/enums";
import { WEEK_DAY_LABELS, WEEK_START_OPTIONS } from "@/lib/constants";
import { findTimeZoneOption, toListedTimeZone } from "@/lib/utils/time-zones";
import { NumberStepper } from "@/app/components/shared/inputs/NumberStepper";
import { useCompany } from "@/hooks/auth/useCompany";
import { useReportDirty } from "@/hooks/useReportDirty";
import { useReportingPeriods } from "@/hooks/useReportingPeriods";
import { useWorkSettings } from "@/hooks/useWorkSettings";
import {
  formatDayMonthYearLabel,
  formatDuration,
  todayISODate,
} from "@/lib/utils/date";
import { firstDayAfterLockedMonths } from "@/lib/utils/reporting-period";
import {
  MAX_WORK_DAY_HOURS,
  WORK_DAY_STEP_HOURS,
} from "@/lib/forms/schemas/work-day.schema";

interface CompanySettingsProps {
  onDirtyChange?: (isDirty: boolean) => void;
}

// The stored zone may be an old alias, so the form shows the listed one; a save
// is compared with these values, so an untouched alias never counts as a change.
const toFormValues = (company: Company, today: string): CompanyFormValues => ({
  companyName: company.companyName ?? "",
  timezone: toListedTimeZone(company.timezone) ?? company.timezone ?? "",
  weekStartDay: company.weekStartDay ?? WeekDay.MONDAY,
  standardWorkHoursPerDay: company.standardWorkHoursPerDay ?? 0,
  standardWorkHoursFrom: today,
});

const hoursLabel = (hoursPerDay: number) => formatDuration(hoursPerDay * 60);

const replacesNote = (change: StandardDayChange) =>
  `Replaces the change to ${hoursLabel(change.hoursPerDay)} a day from ${formatDayMonthYearLabel(change.validFrom)}.`;

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
  scheduled: StandardDayChange | null,
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
    const hours = hoursLabel(next.standardWorkHoursPerDay);
    const from = formatDayMonthYearLabel(next.standardWorkHoursFrom);
    const replaces =
      scheduled && next.standardWorkHoursFrom > saved.standardWorkHoursFrom
        ? ` ${replacesNote(scheduled)}`
        : "";
    changes.push({
      title: `Change the standard day to ${hours} from ${from}?`,
      label: `Standard day to ${hours} from ${from}`,
      consequence: `From ${from}, expected hours change for everyone on the company default; earlier days keep theirs.${replaces}`,
    });
  }

  return changes;
};

const SETTINGS_HEADER = (
  <CardHeader
    icon={Building2}
    title="Company settings"
    description="Manage your company's preferences."
  />
);

/** The form waits for the company, so it never shows or saves empty values. */
export const CompanySettings = ({ onDirtyChange }: CompanySettingsProps) => {
  const { company, query } = useCompany();

  if (!company) {
    return (
      <Card>
        {SETTINGS_HEADER}
        <CardBody>
          {query.isLoading ? (
            <LoadingState size="compact" title="Loading company settings..." />
          ) : (
            <ErrorState
              size="compact"
              title="Could not load company settings"
              onRetry={() => query.refetch()}
            />
          )}
        </CardBody>
      </Card>
    );
  }

  return (
    <CompanySettingsForm company={company} onDirtyChange={onDirtyChange} />
  );
};

const CompanySettingsForm = ({
  company,
  onDirtyChange,
}: CompanySettingsProps & { company: Company }) => {
  const { actions } = useCompany();
  const { timezone } = useWorkSettings();
  const today = todayISODate(timezone);
  // A change reaching into a locked month would rewrite what was expected then.
  const { months } = useReportingPeriods();
  const firstChangeableDay = firstDayAfterLockedMonths(months);
  const scheduled = company.standardDayChange;
  const [isCancellingScheduled, setIsCancellingScheduled] = useState(false);

  // A save that changes how days, weeks or hours count is held here until the
  // owner confirms it, since it reaches everybody.
  const [pendingSave, setPendingSave] = useState<{
    values: CompanyFormValues;
    changes: SettingChange[];
  } | null>(null);

  const {
    register,
    control,
    reset,
    handleSubmit,
    setValue,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: toFormValues(company, today),
  });

  useReportDirty(isDirty, onDirtyChange);

  useEffect(() => {
    reset(toFormValues(company, today));
  }, [company, today, reset]);

  const workHours =
    Number(useWatch({ control, name: "standardWorkHoursPerDay" })) || 0;

  const updateWorkHours = (delta: number) => {
    const next = Math.min(MAX_WORK_DAY_HOURS, Math.max(1, workHours + delta));

    setValue("standardWorkHoursPerDay", next, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const validFrom = useWatch({ control, name: "standardWorkHoursFrom" });
  const replacesScheduled = scheduled && validFrom > today;

  /** The company's own settings, then the standard day from its date. */
  const save = async (data: CompanyFormValues) => {
    const saved = toFormValues(company, today);
    const { standardWorkHoursPerDay, standardWorkHoursFrom, ...settings } =
      data;
    const settingsChanged =
      settings.companyName !== saved.companyName ||
      settings.timezone !== saved.timezone ||
      settings.weekStartDay !== saved.weekStartDay;
    // A new date alone is a change too: it can replace or set back a scheduled change.
    const standardDayChanged =
      standardWorkHoursPerDay !== saved.standardWorkHoursPerDay ||
      standardWorkHoursFrom !== today;

    if (settingsChanged) await actions.update.mutateAsync(settings);
    if (standardDayChanged) {
      await actions.setStandardDay.mutateAsync({
        hoursPerDay: standardWorkHoursPerDay,
        validFrom: standardWorkHoursFrom,
      });
    }
  };

  const onSubmit = async (data: CompanyFormValues) => {
    const changes = changesToConfirm(
      data,
      toFormValues(company, today),
      scheduled,
    );
    if (changes.length > 0) {
      setPendingSave({ values: data, changes });
      return;
    }

    await save(data).catch(() => {
      // Reported by the global mutation handler; the form keeps the edits.
    });
  };

  // A failed save keeps the dialog open; the global handler shows the error.
  const confirmPendingSave = async () => {
    if (!pendingSave) return;

    try {
      await save(pendingSave.values);
      setPendingSave(null);
    } catch {
      // Reported by the global mutation handler.
    }
  };

  const confirmCancelScheduled = () => {
    if (!scheduled) return;

    actions.cancelStandardDayChange.mutate(scheduled.validFrom, {
      onSuccess: () => setIsCancellingScheduled(false),
    });
  };

  const isSaving =
    isSubmitting ||
    actions.update.isPending ||
    actions.setStandardDay.isPending;

  const changes = pendingSave?.changes ?? [];

  return (
    <Card>
      {SETTINGS_HEADER}

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
                <Input
                  label="Standard work hours / day"
                  type="number"
                  min={1}
                  max={MAX_WORK_DAY_HOURS}
                  step={WORK_DAY_STEP_HOURS}
                  placeholder="8"
                  {...register("standardWorkHoursPerDay", {
                    valueAsNumber: true,
                  })}
                  error={errors.standardWorkHoursPerDay?.message}
                  // The stepper stands in for the browser's own spin buttons.
                  className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  endAdornment={
                    <NumberStepper
                      label="Standard work hours / day"
                      canIncrease={workHours < MAX_WORK_DAY_HOURS}
                      canDecrease={workHours > 1}
                      onStep={(direction) =>
                        updateWorkHours(direction * WORK_DAY_STEP_HOURS)
                      }
                    />
                  }
                />
              </div>

              <Controller
                control={control}
                name="standardWorkHoursFrom"
                render={({ field, fieldState }) => (
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    minDate={firstChangeableDay}
                    label="Applies from"
                    description={
                      replacesScheduled
                        ? replacesNote(scheduled)
                        : "Earlier days keep their hours."
                    }
                    error={fieldState.error?.message}
                  />
                )}
              />

              {scheduled && (
                <div className="sm:col-span-2">
                  <ScheduledChange
                    validFrom={scheduled.validFrom}
                    cancel={{
                      label: `Cancel the change to ${hoursLabel(scheduled.hoursPerDay)} a day from ${formatDayMonthYearLabel(scheduled.validFrom)}`,
                      onClick: () => setIsCancellingScheduled(true),
                      // Cancelling reloads the form, so it waits for a save or discard.
                      disabled: isDirty,
                      title: isDirty
                        ? "Save or discard your changes first"
                        : undefined,
                    }}
                  >
                    {hoursLabel(scheduled.hoursPerDay)} a day
                  </ScheduledChange>
                </div>
              )}
            </div>
          </section>
        </CardBody>

        <CardFooter>
          <Button
            type="submit"
            variant="primary"
            disabled={!isDirty}
            isLoading={isSaving}
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
        loading={isSaving}
      />

      {scheduled && (
        <ImpactDialog
          isOpen={isCancellingScheduled}
          title={`Cancel the change to ${hoursLabel(scheduled.hoursPerDay)} a day?`}
          description={`From ${formatDayMonthYearLabel(scheduled.validFrom)} the standard day stays ${hoursLabel(company.standardWorkHoursPerDay)}.`}
          cancelText="Keep it"
          confirmText="Cancel change"
          confirmVariant="warning"
          onConfirm={confirmCancelScheduled}
          onClose={() => setIsCancellingScheduled(false)}
          loading={actions.cancelStandardDayChange.isPending}
        />
      )}
    </Card>
  );
};

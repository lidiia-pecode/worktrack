"use client";

import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Info } from "lucide-react";

import { UserRole } from "@/types/enums";
import { ROLE_LABELS } from "@/lib/constants";
import { Field } from "@/components/ui/field";
import Input from "@/components/ui/input";
import { usePlanningEntries } from "@/hooks/usePlanning";
import { useReportDirty } from "@/hooks/useReportDirty";
import { useWorkSettings } from "@/hooks/useWorkSettings";
import {
  addDays,
  formatDayMonthLabel,
  formatDayMonthYearLabel,
  formatDuration,
  fromISODate,
  toISODate,
  todayISODate,
} from "@/lib/utils/date";
import { countLabel } from "@/lib/utils/text";
import { CapacityChange } from "@/types";
import {
  minutesPerDayOf,
  minutesPerWeekOf,
  workDayHoursSchema,
} from "@/lib/forms/schemas/work-day.schema";
import { useReportingPeriods } from "@/hooks/useReportingPeriods";
import { firstDayAfterLockedMonths } from "@/lib/utils/reporting-period";
import { NO_FIXED_HOURS } from "@/lib/utils/user";
import { WorkDayHoursInput } from "../shared/inputs/WorkDayHoursInput";
import { PanelFormFields } from "../entity-panel/EntityPanelLayout";

import { FormSelect } from "../shared/FormSelect";
import { DatePicker } from "../shared/inputs";

/** `savedHoursPerDay` stays valid as it was saved, before the 30-minute steps. */
const userSchema = (savedHoursPerDay: number) =>
  z.object({
    position: z
      .string()
      .trim()
      .max(255, "Position must be at most 255 characters")
      .optional(),
    role: z.enum(UserRole),
    capacityHoursPerDay: workDayHoursSchema(0, savedHoursPerDay),
    capacityValidFrom: z
      .string()
      .min(1, "Pick the day the change applies from"),
  });

export type UserFormData = z.infer<ReturnType<typeof userSchema>>;

type UserFormProps = {
  formId: string;
  userId: string;
  defaultValues: UserFormData;
  /** The hours change already waiting to start; a later date replaces it. */
  scheduledChange?: CapacityChange | null;
  /** The day their hours in force today started; none on the standard day. */
  hoursSince?: string | null;
  onSubmit: (data: UserFormData) => void | Promise<unknown>;
  onDirtyChange?: (isDirty: boolean) => void;
};

const roleOptions = [
  { value: UserRole.EMPLOYEE, label: ROLE_LABELS[UserRole.EMPLOYEE] },
  { value: UserRole.MANAGER, label: ROLE_LABELS[UserRole.MANAGER] },
];

export const UserForm = ({
  formId,
  userId,
  defaultValues,
  scheduledChange,
  hoursSince,
  onSubmit,
  onDirtyChange,
}: UserFormProps) => {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema(defaultValues.capacityHoursPerDay)),
    defaultValues,
  });
  const hoursPerDay = useWatch({ control, name: "capacityHoursPerDay" });
  const minutesPerWeek = minutesPerWeekOf(hoursPerDay);
  const role = useWatch({ control, name: "role" });
  const validFrom = useWatch({ control, name: "capacityValidFrom" });
  const { timezone } = useWorkSettings();
  const replacesScheduledChange =
    scheduledChange && validFrom > todayISODate(timezone);
  // Saving 0h deletes the person's plans from that day, up to hours already
  // scheduled to come back.
  const hasNoHours = minutesPerWeek === 0;
  const hoursBackOn =
    scheduledChange &&
    !replacesScheduledChange &&
    scheduledChange.minutesPerWeek > 0
      ? scheduledChange.validFrom
      : null;
  const { items: removedPlans } = usePlanningEntries(
    {
      userId,
      dateFrom: validFrom,
      dateTo: hoursBackOn
        ? toISODate(addDays(fromISODate(hoursBackOn), -1))
        : undefined,
    },
    { enabled: hasNoHours && Boolean(validFrom) },
  );
  // Hours in force today that started after that day mean a past change may
  // bring hours back sooner than the form can see, so the count is an upper
  // bound (the server ends the deletion at the first change with hours).
  const isCountAtMost = Boolean(hoursSince && hoursSince > validFrom);
  const removedMinutes = removedPlans.reduce(
    (total, plan) => total + plan.plannedMinutes,
    0,
  );
  const losesManagerAccess =
    defaultValues.role === UserRole.MANAGER && role === UserRole.EMPLOYEE;
  // The API refuses a change that would reach back into a locked month.
  const { months } = useReportingPeriods();
  const firstChangeableDay = firstDayAfterLockedMonths(months);

  useReportDirty(isDirty, onDirtyChange);

  return (
    // The schema checks the hours, so a value saved before the working day had
    // its steps and limit isn't refused by the browser's own checks.
    <form id={formId} onSubmit={handleSubmit(onSubmit)} noValidate>
      <PanelFormFields>
        <Input
          label="Position"
          {...register("position")}
          placeholder="e.g. Frontend Developer"
          autoFocus
          error={errors.position?.message}
        />

        {/* An owner's role doesn't change here. */}
        {defaultValues.role !== UserRole.OWNER && (
          <Controller
            control={control}
            name="role"
            render={({ field, fieldState }) => (
              <FormSelect
                label="Role"
                value={field.value}
                onValueChange={field.onChange}
                options={roleOptions}
                description={
                  losesManagerAccess &&
                  "As an Employee they lose Team time, Planning, Reports and Manage."
                }
                error={fieldState.error?.message}
              />
            )}
          />
        )}

        <Field id="user-working-hours" group>
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={control}
              name="capacityHoursPerDay"
              render={({ field, fieldState }) => (
                <WorkDayHoursInput
                  {...field}
                  label="Working hours a day"
                  note={
                    hasNoHours &&
                    `${NO_FIXED_HOURS}: not expected to log time, no missing days, can't be planned.`
                  }
                  min={0}
                  error={fieldState.error?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="capacityValidFrom"
              render={({ field, fieldState }) => (
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  minDate={firstChangeableDay}
                  label="Applies from"
                  description={
                    replacesScheduledChange
                      ? `Replaces the change to ${formatDuration(minutesPerDayOf(scheduledChange.minutesPerWeek))} a day from ${formatDayMonthYearLabel(scheduledChange.validFrom)}.`
                      : "Earlier weeks keep their hours."
                  }
                  error={fieldState.error?.message}
                />
              )}
            />
          </div>

          {hasNoHours && removedPlans.length > 0 && (
            <p className="flex gap-2 text-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                {`Deletes ${isCountAtMost ? "up to " : ""}${countLabel(removedPlans.length, "plan", "plans")} (${formatDuration(removedMinutes)}) from ${formatDayMonthLabel(validFrom)}, since nobody is planned at 0h.`}
              </span>
            </p>
          )}
        </Field>
      </PanelFormFields>
    </form>
  );
};

"use client";

import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { UserRole } from "@/types/enums";
import { ROLE_LABELS } from "@/lib/constants";
import { Field } from "@/components/ui/field";
import Input from "@/components/ui/input";
import { useReportDirty } from "@/hooks/useReportDirty";
import { formatDuration } from "@/lib/utils/date";
import {
  MAX_WORK_DAY_HOURS,
  WORK_DAYS_PER_WEEK,
  WORK_DAY_STEP_HOURS,
  workDayHoursSchema,
} from "@/lib/forms/schemas/work-day.schema";
import { useReportingPeriods } from "@/hooks/useReportingPeriods";
import { firstDayAfterLockedMonths } from "@/lib/utils/reporting-period";

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
  defaultValues: UserFormData;
  onSubmit: (data: UserFormData) => void | Promise<unknown>;
  onDirtyChange?: (isDirty: boolean) => void;
};

const roleOptions = [
  { value: UserRole.EMPLOYEE, label: ROLE_LABELS[UserRole.EMPLOYEE] },
  { value: UserRole.MANAGER, label: ROLE_LABELS[UserRole.MANAGER] },
];

export const UserForm = ({
  formId,
  defaultValues,
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
  const minutesPerWeek = Math.round(hoursPerDay * 60) * WORK_DAYS_PER_WEEK;
  const role = useWatch({ control, name: "role" });
  const losesManagerAccess =
    defaultValues.role === UserRole.MANAGER && role === UserRole.EMPLOYEE;
  // The API refuses a change that would reach back into a locked month.
  const { months } = useReportingPeriods();
  const firstChangeableDay = firstDayAfterLockedMonths(months);

  useReportDirty(isDirty, onDirtyChange);

  return (
    // The schema checks the hours, so a value saved before the working day had
    // its steps and limit isn't refused by the browser's own checks.
    <form
      id={formId}
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-6"
    >
      <Input
        label="Position"
        {...register("position")}
        placeholder="e.g. Frontend Developer"
        autoFocus
        error={errors.position?.message}
      />

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

      <Field id="user-working-hours" group>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            {...register("capacityHoursPerDay", { valueAsNumber: true })}
            type="number"
            min={0}
            max={MAX_WORK_DAY_HOURS}
            step={WORK_DAY_STEP_HOURS}
            label="Working hours a day"
            description={
              Number.isFinite(minutesPerWeek) &&
              `${formatDuration(minutesPerWeek)} a week`
            }
            error={errors.capacityHoursPerDay?.message}
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
                description="Earlier weeks keep their hours."
                error={fieldState.error?.message}
              />
            )}
          />
        </div>
      </Field>
    </form>
  );
};

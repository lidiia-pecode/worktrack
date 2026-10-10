"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Capacity } from "@/types";
import { UserRole } from "@/types/enums";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDuration } from "@/lib/utils/date";
import { Badge } from "@/components/ui/badge";
import { Field, fieldLabelClassName } from "@/components/ui/field";
import Input from "@/components/ui/input";

import { FormSelect } from "../shared/FormSelect";
import { DateInput } from "../shared/inputs";

const userSchema = z.object({
  position: z
    .string()
    .trim()
    .max(255, "Position must be at most 255 characters")
    .optional(),
  role: z.enum(UserRole),
  capacityHoursPerWeek: z
    .number({ error: "Enter the contracted hours per week" })
    .min(0, "Hours cannot be negative")
    .max(168, "A week only has 168 hours"),
  capacityValidFrom: z.string().min(1, "Pick the day the change applies from"),
});

export type UserFormData = z.infer<typeof userSchema>;

type UserFormProps = {
  formId: string;
  defaultValues: UserFormData;
  isEditMode: boolean;
  /** Working hours are the owner's to read. */
  showsWorkingHours: boolean;
  capacity: Capacity | null;
  onSubmit: (data: UserFormData) => void;
};

const roleOptions = [
  { value: UserRole.EMPLOYEE, label: ROLE_LABELS[UserRole.EMPLOYEE] },
  { value: UserRole.MANAGER, label: ROLE_LABELS[UserRole.MANAGER] },
];

const sinceFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export const describeCapacity = (capacity: Capacity | null) => {
  if (!capacity) return "Not set";

  const hours = formatDuration(capacity.minutesPerWeek);

  if (capacity.isCompanyDefault) return `${hours} per week (company default)`;
  if (!capacity.validFrom) return `${hours} per week`;

  return `${hours} per week, since ${sinceFormatter.format(
    new Date(`${capacity.validFrom}T00:00:00`),
  )}`;
};

export const UserForm = ({
  formId,
  defaultValues,
  isEditMode,
  showsWorkingHours,
  capacity,
  onSubmit,
}: UserFormProps) => {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues,
  });

  if (!isEditMode) {
    return (
      <dl className="space-y-6">
        <div>
          <dt className={fieldLabelClassName}>Position</dt>
          <dd className="text-sm text-foreground">
            {defaultValues.position || "Not specified"}
          </dd>
        </div>

        <div>
          <dt className={fieldLabelClassName}>Role</dt>
          <dd>
            <Badge>{ROLE_LABELS[defaultValues.role]}</Badge>
          </dd>
        </div>

        {showsWorkingHours && (
          <div>
            <dt className={fieldLabelClassName}>Working hours</dt>
            <dd className="text-sm text-foreground">
              {describeCapacity(capacity)}
            </dd>
          </div>
        )}
      </dl>
    );
  }

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Input
        label="Position"
        {...register("position")}
        placeholder="e.g. Frontend Developer"
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
            error={fieldState.error?.message}
          />
        )}
      />

      <Field id="user-working-hours" label="Working hours" group>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            {...register("capacityHoursPerWeek", { valueAsNumber: true })}
            type="number"
            min={0}
            max={168}
            step={0.5}
            label="Contracted hours per week"
            description="Hours per week, not per day."
            error={errors.capacityHoursPerWeek?.message}
          />

          <DateInput
            {...register("capacityValidFrom")}
            label="Applies from"
            description="Earlier weeks keep the hours they were measured against."
            error={errors.capacityValidFrom?.message}
          />
        </div>
      </Field>
    </form>
  );
};

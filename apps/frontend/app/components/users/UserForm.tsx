"use client";

import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { UserRole } from "@/types/enums";
import { ROLE_LABELS } from "@/lib/constants";
import { Field } from "@/components/ui/field";
import Input from "@/components/ui/input";
import { useReportDirty } from "@/hooks/useReportDirty";

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
    resolver: zodResolver(userSchema),
    defaultValues,
  });
  const role = useWatch({ control, name: "role" });
  const losesManagerAccess =
    defaultValues.role === UserRole.MANAGER && role === UserRole.EMPLOYEE;

  useReportDirty(isDirty, onDirtyChange);

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

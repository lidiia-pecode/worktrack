"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { UserRole } from "@/types/enums";
import { ROLE_LABELS } from "@/lib/constants";

import { FormSection } from "../shared/FormSection";
import { FormSelect } from "../shared/FormSelect";

const userSchema = z.object({
  position: z.string().trim().max(100).optional(),

  role: z.enum(UserRole),
});

export type UserFormData = z.infer<typeof userSchema>;

type UserFormProps = {
  formId: string;
  defaultValues: UserFormData;
  isEditMode: boolean;
  onSubmit: (data: UserFormData) => void;
};

const roleOptions = [
  {
    value: UserRole.EMPLOYEE,
    label: ROLE_LABELS[UserRole.EMPLOYEE],
  },
  {
    value: UserRole.MANAGER,
    label: ROLE_LABELS[UserRole.MANAGER],
  },
];

export function UserForm({
  formId,
  defaultValues,
  isEditMode,
  onSubmit,
}: UserFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues,
  });

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormSection label="Position">
        {isEditMode ? (
          <div className="space-y-1.5">
            <input
              {...register("position")}
              placeholder="e.g. Frontend Developer"
              className="
                h-11 w-full rounded-xl
                border border-border
                bg-input px-3.5
                text-sm text-input-foreground
                outline-none transition
                placeholder:text-input-placeholder
                focus:border-ring
                focus:ring-2 focus:ring-ring/20
              "
            />

            {errors.position && (
              <p className="text-xs text-destructive">
                {errors.position.message}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-foreground">
            {defaultValues.position || "Not specified"}
          </p>
        )}
      </FormSection>

      <FormSection label="Role">
        {isEditMode ? (
          <Controller
            control={control}
            name="role"
            render={({ field, fieldState }) => (
              <FormSelect
                value={field.value}
                onValueChange={field.onChange}
                options={roleOptions}
                error={fieldState.error?.message}
              />
            )}
          />
        ) : (
          <span
            className="
              inline-flex items-center rounded-full
              bg-accent px-2.5 py-1
              text-xs font-medium
              text-accent-foreground
            "
          >
            {ROLE_LABELS[defaultValues.role]}
          </span>
        )}
      </FormSection>
    </form>
  );
}

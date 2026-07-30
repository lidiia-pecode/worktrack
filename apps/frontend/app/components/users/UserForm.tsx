"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { UserRole } from "@/types/enums";
import { ROLE_LABELS } from "@/lib/constants";
import { FormSection } from "../shared/FormSection";
import { FormSelect } from "../shared/FormSelect";

const userSchema = z.object({
  position: z.string().optional(),
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
  { value: UserRole.USER, label: ROLE_LABELS[UserRole.USER] },
  { value: UserRole.ADMIN, label: ROLE_LABELS[UserRole.ADMIN] },
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
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <FormSection label="Position">
        {isEditMode ? (
          <div className="flex flex-col gap-1">
            <input
              {...register("position")}
              placeholder="Enter position"
              className={`w-full rounded-xl border px-4 py-3 outline-none transition focus:border-blue-500 ${
                errors.position ? "border-red-400" : "border-zinc-200"
              }`}
            />
            {errors.position && (
              <p className="mt-1 text-sm text-red-500">
                {errors.position.message}
              </p>
            )}
          </div>
        ) : (
          <span className="text-sm text-zinc-700">
            {defaultValues.position || "—"}
          </span>
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
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 text-violet-700 ring-1 ring-violet-200 px-3 py-1 text-xs font-medium">
            {ROLE_LABELS[defaultValues.role]}
          </span>
        )}
      </FormSection>
    </form>
  );
}

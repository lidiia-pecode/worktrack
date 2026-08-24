"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import Input from "@/components/ui/input";
import { UserRole } from "@/types/enums";
import { ROLE_LABELS } from "@/lib/constants";

import { FormSelect } from "../shared/FormSelect";
import {
  InviteUserFormData,
  inviteUserSchema,
} from "@/lib/forms/schemas/invite-user.schema";

interface InviteUserFormProps {
  formId?: string;
  isSubmitting?: boolean;
  onSubmit: (data: InviteUserFormData) => void;
}

const roleOptions = [
  { value: UserRole.EMPLOYEE, label: ROLE_LABELS[UserRole.EMPLOYEE] },
  { value: UserRole.MANAGER, label: ROLE_LABELS[UserRole.MANAGER] },
];

export function InviteUserForm({
  formId = "invite-user-form",
  isSubmitting = false,
  onSubmit,
}: InviteUserFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<InviteUserFormData>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: "",
      role: UserRole.EMPLOYEE,
    },
  });

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Input
        id="invite-user-email"
        label="Email"
        type="email"
        placeholder="john@example.com"
        {...register("email")}
        error={errors.email?.message}
        disabled={isSubmitting}
      />

      <Controller
        name="role"
        control={control}
        render={({ field, fieldState }) => (
          <FormSelect
            id="invite-user-role"
            label="Role"
            value={field.value}
            onValueChange={field.onChange}
            options={roleOptions}
            placeholder="Select a role"
            error={fieldState.error?.message}
            disabled={isSubmitting}
          />
        )}
      />

      <Button type="submit" disabled={isSubmitting} className="w-full">
        Send invitation
      </Button>
    </form>
  );
}

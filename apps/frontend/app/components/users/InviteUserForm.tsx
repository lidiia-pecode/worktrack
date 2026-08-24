"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import Input from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserRole } from "@/types/enums";

import { ResourceFormField } from "../shared/ResourceFormField";
import {
  InviteUserFormData,
  inviteUserSchema,
} from "@/lib/forms/schemas/invite-user.schema";

interface InviteUserFormProps {
  formId?: string;
  isSubmitting?: boolean;
  onSubmit: (data: InviteUserFormData) => void;
}

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
        type="email"
        placeholder="john@example.com"
        {...register("email")}
        error={errors.email?.message}
        disabled={isSubmitting}
      />

      <ResourceFormField id="invite-user-role" label="Role" error={errors.role}>
        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={isSubmitting}
            >
              <SelectTrigger
                id="invite-user-role"
                ref={field.ref}
                aria-invalid={!!errors.role}
                className="
                  border-input-placeholder/50
                  bg-input
                  text-input-foreground
                  focus-visible:ring-2
                  focus-visible:ring-ring/20
                "
              >
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem
                  className="
                    rounded-none
                    px-3
                    py-2

                  "
                  value={UserRole.EMPLOYEE}
                >
                  Employee
                </SelectItem>

                <SelectItem
                  className="
                    rounded-none
                    px-3
                    py-2

                  "
                  value={UserRole.MANAGER}
                >
                  Manager
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </ResourceFormField>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        Send invitation
      </Button>
    </form>
  );
}

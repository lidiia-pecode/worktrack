"use client";

import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import Input from "@/components/ui/input";

import { UserRole } from "@/types/enums";
import { ROLE_LABELS } from "@/lib/constants";

import { FormSelect } from "../shared/FormSelect";

import {
  inviteUserSchema,
  InviteUserFormData,
} from "@/lib/forms/schemas/invite-user.schema";
import { useAuth } from "@/hooks/auth/useAuth";
import { useTeamOptions } from "@/hooks/useTeams";

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
  const { user } = useAuth();
  const isOwner = user?.role === UserRole.OWNER;

  const { options: teamOptions, isLoading: isLoadingTeams } = useTeamOptions();

  const roleOptions = isOwner
    ? [
        {
          value: UserRole.MANAGER,
          label: ROLE_LABELS[UserRole.MANAGER],
        },
        {
          value: UserRole.EMPLOYEE,
          label: ROLE_LABELS[UserRole.EMPLOYEE],
        },
      ]
    : [
        {
          value: UserRole.EMPLOYEE,
          label: ROLE_LABELS[UserRole.EMPLOYEE],
        },
      ];

  const defaultRole = isOwner ? UserRole.MANAGER : UserRole.EMPLOYEE;

  const {
    register,
    control,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<InviteUserFormData>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: "",
      role: defaultRole,
    },
  });

  const role = useWatch({ control, name: "role" });

  // Accepting an invitation always creates a plain member, so only an employee
  // can be invited straight into a team.
  const showTeamField = role === UserRole.EMPLOYEE;

  const hasNoTeams = !isLoadingTeams && teamOptions.length === 0;
  const cannotInviteIntoTeam = showTeamField && hasNoTeams;

  const noTeamsMessage = isOwner
    ? "Create a team first. An employee always joins into a team."
    : "You do not lead any team yet. An owner adds you to one.";

  useEffect(() => {
    if (teamOptions.length === 1) {
      setValue("teamId", teamOptions[0].value);
    }
  }, [teamOptions, setValue]);

  const submit = (data: InviteUserFormData) =>
    onSubmit(showTeamField ? data : { ...data, teamId: undefined });

  return (
    <form id={formId} onSubmit={handleSubmit(submit)} className="space-y-5">
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

      {showTeamField && (
        <Controller
          name="teamId"
          control={control}
          render={({ field, fieldState }) => (
            <FormSelect
              id="invite-user-team"
              label="Team"
              value={field.value}
              onValueChange={field.onChange}
              options={teamOptions}
              placeholder="Select a team"
              description={hasNoTeams ? noTeamsMessage : undefined}
              error={fieldState.error?.message}
              disabled={isSubmitting || isLoadingTeams || hasNoTeams}
            />
          )}
        />
      )}

      <Button
        type="submit"
        disabled={isSubmitting || cannotInviteIntoTeam}
        className="w-full"
      >
        Send invitation
      </Button>
    </form>
  );
}

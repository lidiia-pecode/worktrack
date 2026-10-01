"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import Input from "@/components/ui/input";

import { UserRole } from "@/types/enums";
import { MANAGER_WITHOUT_TEAM_MESSAGE, ROLE_LABELS } from "@/lib/constants";

import { FormSelect } from "../shared/FormSelect";

import {
  inviteUserSchema,
  InviteUserFormData,
} from "@/lib/forms/schemas/invite-user.schema";
import { useAuth } from "@/hooks/auth/useAuth";
import { useTeamOptions } from "@/hooks/useTeams";

const NO_TEAM = "none";

interface InviteUserFormProps {
  formId: string;
  isSubmitting?: boolean;
  onSubmit: (data: InviteUserFormData) => void;
  onCanSubmitChange: (canSubmit: boolean) => void;
}

export function InviteUserForm({
  formId,
  isSubmitting = false,
  onSubmit,
  onCanSubmitChange,
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
    getFieldState,
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

  // An employee always joins a team; a manager may be invited to lead one,
  // which is optional and offered only when a team exists.
  const isEmployee = role === UserRole.EMPLOYEE;
  const hasNoTeams = !isLoadingTeams && teamOptions.length === 0;
  const cannotInviteIntoTeam = isEmployee && hasNoTeams;

  const noTeamsMessage = isOwner ? (
    <>
      An employee always joins into a team.{" "}
      <Link
        href="/admin/teams?create=true"
        className="font-medium text-brand underline-offset-4 hover:underline"
      >
        Create a team first
      </Link>
    </>
  ) : (
    MANAGER_WITHOUT_TEAM_MESSAGE
  );

  useEffect(() => {
    onCanSubmitChange(!cannotInviteIntoTeam);
  }, [cannotInviteIntoTeam, onCanSubmitChange]);

  useEffect(() => {
    if (!getFieldState("role").isDirty) {
      setValue("role", defaultRole);
    }
  }, [defaultRole, getFieldState, setValue]);

  useEffect(() => {
    if (!isEmployee) {
      setValue("teamId", undefined);
    } else if (teamOptions.length === 1) {
      setValue("teamId", teamOptions[0].value);
    }
  }, [isEmployee, teamOptions, setValue]);

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

      {isEmployee && (
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

      {!isEmployee && !hasNoTeams && (
        <Controller
          name="teamId"
          control={control}
          render={({ field, fieldState }) => (
            <FormSelect
              id="invite-user-team-to-lead"
              label="Team to lead (optional)"
              value={field.value ?? NO_TEAM}
              onValueChange={(value) =>
                field.onChange(value === NO_TEAM ? undefined : value)
              }
              options={[{ value: NO_TEAM, label: "No team" }, ...teamOptions]}
              description="They become this team's manager when they accept."
              error={fieldState.error?.message}
              disabled={isSubmitting || isLoadingTeams}
            />
          )}
        />
      )}
    </form>
  );
}

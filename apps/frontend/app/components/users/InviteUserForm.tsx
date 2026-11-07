"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useReportDirty } from "@/hooks/useReportDirty";

import { isConflictError, getErrorMessage } from "@/lib/api";

import { UserRole } from "@/types/enums";
import { MANAGER_WITHOUT_TEAM_MESSAGE, ROLE_LABELS } from "@/lib/constants";

import { Field } from "@/components/ui/field";

import { PanelTitleInput } from "../entity-panel/EntityPanelLayout";
import { FormSelect } from "../shared/FormSelect";
import { OptionCard, OptionCards } from "../shared/inputs/OptionCards";

import {
  inviteUserSchema,
  InviteUserFormData,
} from "@/lib/forms/schemas/invite-user.schema";
import { useAuth } from "@/hooks/auth/useAuth";
import { usePendingInvitations } from "@/hooks/auth/useInvitation";
import { useTeamOptions } from "@/hooks/useTeams";
import { fullName } from "@/lib/utils/user";

import { managerMembership } from "../teams/team-memberships";

const NO_TEAM = "none";

const ROLE_OPTIONS: OptionCard<UserRole>[] = [
  {
    value: UserRole.MANAGER,
    label: ROLE_LABELS[UserRole.MANAGER],
    description: "Leads a team, and sees and corrects its people's time.",
  },
  {
    value: UserRole.EMPLOYEE,
    label: ROLE_LABELS[UserRole.EMPLOYEE],
    description: "Logs their own time and absences, in a team.",
  },
];

interface InviteUserFormProps {
  formId: string;
  isSubmitting?: boolean;
  onSubmit: (data: InviteUserFormData) => void | Promise<unknown>;
  onCanSubmitChange: (canSubmit: boolean) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export const InviteUserForm = ({
  formId,
  isSubmitting = false,
  onSubmit,
  onCanSubmitChange,
  onDirtyChange,
}: InviteUserFormProps) => {
  const { user } = useAuth();
  const isOwner = user?.role === UserRole.OWNER;

  const {
    options: teamOptions,
    teams,
    isLoading: isLoadingTeams,
  } = useTeamOptions();
  const { data: invitations = [] } = usePendingInvitations();
  // A team has one manager, and a pending manager invitation holds the lead,
  // so those teams are listed but can't be chosen, with the reason.
  const teamToLeadOptions = teams.map((team) => {
    const lead = managerMembership(team)?.user;
    const isLeadInvited = invitations.some(
      (invitation) =>
        invitation.team?.id === team.id && invitation.role === UserRole.MANAGER,
    );
    const takenBy = lead
      ? `led by ${fullName(lead)}`
      : isLeadInvited
        ? "manager invited"
        : null;

    return {
      value: team.id,
      label: takenBy ? `${team.name} · ${takenBy}` : team.name,
      disabled: Boolean(takenBy),
    };
  });
  const hasTakenTeams = teamToLeadOptions.some((option) => option.disabled);

  // Only an owner invites a Manager; a manager invites employees only.
  const defaultRole = isOwner ? UserRole.MANAGER : UserRole.EMPLOYEE;

  const {
    register,
    control,
    setValue,
    setError,
    getFieldState,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<InviteUserFormData>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: "",
      role: defaultRole,
    },
  });

  useReportDirty(isDirty, onDirtyChange);

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
    if (!isEmployee) setValue("teamId", undefined);
  }, [isEmployee, setValue]);

  useEffect(() => {
    if (isEmployee && teamOptions.length === 1) {
      setValue("teamId", teamOptions[0].value);
    }
  }, [isEmployee, teamOptions, setValue]);

  // The API refuses an email already in use; show it under the field.
  const submit = async (data: InviteUserFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      if (isConflictError(error)) {
        setError("email", { message: getErrorMessage(error) });
      }
    }
  };

  return (
    <form id={formId} onSubmit={handleSubmit(submit)} className="space-y-6">
      <PanelTitleInput
        id="invite-user-email"
        aria-label="Email"
        type="email"
        placeholder="name@company.com"
        autoFocus
        {...register("email")}
        error={errors.email?.message}
        disabled={isSubmitting}
      />

      {isOwner && (
        <Field id="invite-user-role" label="Role" group>
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <OptionCards
                name="invite-user-role"
                value={field.value}
                options={ROLE_OPTIONS}
                onChange={field.onChange}
                disabled={isSubmitting}
              />
            )}
          />
        </Field>
      )}

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
              options={[
                { value: NO_TEAM, label: "No team" },
                ...teamToLeadOptions,
              ]}
              description={
                hasTakenTeams
                  ? "They become this team's manager when they accept. To replace a team's manager, invite them with no team, then use Change manager once they join."
                  : "They become this team's manager when they accept."
              }
              error={fieldState.error?.message}
              disabled={isSubmitting || isLoadingTeams}
            />
          )}
        />
      )}
    </form>
  );
};

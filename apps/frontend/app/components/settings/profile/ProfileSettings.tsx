"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { User } from "@/types";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import {
  ProfileFormValues,
  profileSchema,
} from "@/lib/forms/schemas/profile.schema";
import { SettingsSection } from "../components/SettingsSection";
import { SettingsSectionHeader } from "../components/SettingsSectionHeader";
import Input from "../../shared/Input";
import { SettingsActions } from "../components/SettingsActions";
import {
  settingsInputClassName,
  settingsLabelClassName,
} from "../styles/settings-styles";

interface ProfileSettingsProps {
  user: User | null;
}

export const ProfileSettings = ({ user }: ProfileSettingsProps) => {
  const { actions } = useProfile();

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty, errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: "",
    },
  });

  useEffect(() => {
    if (!user) return;

    reset({
      username: user.username ?? "",
    });
  }, [user, reset]);

  const onSubmit = (data: ProfileFormValues) => {
    actions.update.mutate({
      username: data.username,
    });
  };

  return (
    <SettingsSection>
      <SettingsSectionHeader
        title="Profile"
        description="Manage your personal information."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="p-6">
        <div className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <Input
              label="First name"
              value={user?.firstName ?? ""}
              disabled
              className={settingsInputClassName}
              labelClassname={settingsLabelClassName}
            />

            <Input
              label="Last name"
              value={user?.lastName ?? ""}
              disabled
              className={settingsInputClassName}
              labelClassname={settingsLabelClassName}
            />
          </div>

          <Input
            label="Username"
            {...register("username")}
            error={errors.username?.message}
            className={settingsInputClassName}
            labelClassname={settingsLabelClassName}
          />

          <Input
            label="Email"
            value={user?.email ?? ""}
            disabled
            className={settingsInputClassName}
            labelClassname={settingsLabelClassName}
          />
        </div>

        <SettingsActions>
          <Button
            type="submit"
            variant="primary"
            disabled={!isDirty || actions.update.isPending}
          >
            {actions.update.isPending ? "Saving..." : "Save changes"}
          </Button>
        </SettingsActions>
      </form>
    </SettingsSection>
  );
};

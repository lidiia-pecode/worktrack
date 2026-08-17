"use client";

import { KeyRound, ShieldCheck } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  SecurityFormValues,
  securitySchema,
} from "@/lib/forms/schemas/security.schema";
import { SettingsSection } from "../components/SettingsSection";
import { SettingsSectionHeader } from "../components/SettingsSectionHeader";
import { SettingsActions } from "../components/SettingsActions";
import {
  settingsInputClassName,
  settingsLabelClassName,
} from "../styles/settings-styles";
import { PasswordInput } from "../../auth/components/PasswordInput";
import { useSecurity } from "@/hooks/useSecurity";
import { useAuth } from "@/hooks/useAuth";

export const SecuritySettings = () => {
  const { user } = useAuth();
  const { actions } = useSecurity();

  const hasPassword = user?.hasPassword ?? false;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid, isSubmitting },
  } = useForm<SecurityFormValues>({
    resolver: zodResolver(securitySchema),
    mode: "onChange",
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: SecurityFormValues) => {
    await actions.changePassword.mutateAsync({
      ...(hasPassword && {
        currentPassword: data.currentPassword,
      }),
      newPassword: data.newPassword,
    });

    reset();
  };

  return (
    <div className="space-y-6">
      <SettingsSection>
        <SettingsSectionHeader
          icon={KeyRound}
          title="Password"
          description={
            hasPassword
              ? "Update your password to keep your account secure."
              : "You currently sign in with Google. Set a password to also sign in with your email and password."
          }
        />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-6">
          {hasPassword && (
            <PasswordInput
              label="Current password"
              type="password"
              placeholder="Enter your current password"
              {...register("currentPassword")}
              error={errors.currentPassword?.message}
              className={settingsInputClassName}
              labelClassname={settingsLabelClassName}
            />
          )}

          <PasswordInput
            label={hasPassword ? "New password" : "Set password"}
            type="password"
            placeholder="Enter a new password"
            {...register("newPassword")}
            error={errors.newPassword?.message}
            className={settingsInputClassName}
            labelClassname={settingsLabelClassName}
          />

          <PasswordInput
            label={hasPassword ? "Confirm new password" : "Confirm password"}
            type="password"
            placeholder="Repeat your new password"
            {...register("confirmPassword")}
            error={errors.confirmPassword?.message}
            className={settingsInputClassName}
            labelClassname={settingsLabelClassName}
          />

          {/* requirements */}

          <SettingsActions>
            <Button
              type="submit"
              variant="primary"
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting
                ? "Saving..."
                : hasPassword
                  ? "Change password"
                  : "Set password"}
            </Button>
          </SettingsActions>
        </form>
      </SettingsSection>

      <SettingsSection>
        <div className="flex items-start gap-3 rounded-lg border border-blue-400/20 bg-blue-500/5 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-400/20 bg-blue-500/10 text-blue-300">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-100">
              Account security
            </h3>

            <p className="mt-1 text-sm leading-relaxed text-slate-400">
              Your account is protected with secure authentication and encrypted
              sessions.
            </p>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
};

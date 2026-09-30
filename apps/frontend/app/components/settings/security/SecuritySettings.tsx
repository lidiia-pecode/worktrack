"use client";

import { CircleCheck, KeyRound, Link2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  SecurityFormValues,
  createSecuritySchema,
} from "@/lib/forms/schemas/security.schema";
import { PASSWORD_RULES_HINT } from "@/lib/forms/schemas/password.schema";
import { applyServerErrors } from "@/lib/forms/utils/apply-server-errors";
import { isApiValidationError } from "@/lib/api/errors";
import { SettingsSection } from "../components/SettingsSection";
import { SettingsSectionHeader } from "../components/SettingsSectionHeader";
import { SettingsActions } from "../components/SettingsActions";
import { settingsLabelClassName } from "../styles/settings-styles";
import { PasswordInput } from "../../shared/inputs/PasswordInput";
import { useSecurity } from "@/hooks/useSecurity";
import { useAuth } from "@/hooks/auth/useAuth";
import { GOOGLE_LINK_URL } from "@/lib/constants";

export const SecuritySettings = () => {
  const { user } = useAuth();
  const { actions } = useSecurity();

  const hasPassword = user?.hasPassword;
  const isGoogleLinked = user?.googleLinked;

  const handleGoogleLink = () => {
    window.location.href = GOOGLE_LINK_URL;
  };

  const {
    register,
    handleSubmit,
    reset,
    setError,
    trigger,
    getValues,
    formState: { errors, isDirty },
  } = useForm<SecurityFormValues>({
    resolver: zodResolver(createSecuritySchema(!!hasPassword)),
    mode: "onTouched",
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: SecurityFormValues) => {
    try {
      await actions.changePassword.mutateAsync({
        ...(hasPassword && { currentPassword: data.currentPassword }),
        newPassword: data.newPassword,
      });

      reset();
    } catch (error: unknown) {
      if (isApiValidationError(error)) {
        applyServerErrors(error, setError);
      }
    }
  };

  const revalidateConfirmation = () => {
    if (getValues("confirmPassword")) {
      trigger("confirmPassword");
    }
  };

  return (
    <div className="space-y-6">
      <SettingsSection>
        <SettingsSectionHeader
          icon={Link2}
          title="Connected accounts"
          description="Manage the accounts you can use to sign in."
        />

        <div className="p-6">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground">
                  Google
                </h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  {isGoogleLinked
                    ? `You can sign in with the Google account for ${user?.email}.`
                    : "Use your Google account to sign in."}
                </p>
              </div>
            </div>

            {isGoogleLinked ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-success-text">
                <CircleCheck className="size-4" aria-hidden="true" />
                Connected
              </span>
            ) : (
              <Button
                type="button"
                variant="primary"
                onClick={handleGoogleLink}
              >
                Link Google
              </Button>
            )}
          </div>
        </div>
      </SettingsSection>

      <SettingsSection>
        <SettingsSectionHeader
          icon={KeyRound}
          title="Password"
          description={
            hasPassword
              ? "Change the password you use to sign in. This signs you out on your other devices."
              : "You sign in with Google. Set a password to also sign in with your email."
          }
        />

        <form onSubmit={handleSubmit(onSubmit)} className="p-6" noValidate>
          {/* Lets password managers save the new password against the right account. */}
          <input
            type="email"
            autoComplete="username"
            value={user?.email ?? ""}
            readOnly
            hidden
          />

          <div className="space-y-6">
            {hasPassword && (
              <PasswordInput
                label="Current password"
                autoComplete="current-password"
                {...register("currentPassword")}
                error={errors.currentPassword?.message}
                labelClassname={settingsLabelClassName}
              />
            )}

            <div className="grid items-start gap-6 sm:grid-cols-2">
              <PasswordInput
                label="New password"
                autoComplete="new-password"
                description={PASSWORD_RULES_HINT}
                {...register("newPassword", {
                  onChange: revalidateConfirmation,
                })}
                error={errors.newPassword?.message}
                labelClassname={settingsLabelClassName}
              />

              <PasswordInput
                label="Confirm new password"
                autoComplete="new-password"
                {...register("confirmPassword")}
                error={errors.confirmPassword?.message}
                labelClassname={settingsLabelClassName}
              />
            </div>
          </div>

          <SettingsActions className="flex-wrap items-center gap-4">
            {hasPassword && (
              <Link
                href="/forgot-password"
                className="mr-auto text-sm whitespace-nowrap text-brand hover:underline"
              >
                Forgot your password?
              </Link>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={!isDirty}
              isLoading={actions.changePassword.isPending}
            >
              {hasPassword ? "Change password" : "Set password"}
            </Button>
          </SettingsActions>
        </form>
      </SettingsSection>
    </div>
  );
};

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
import Input from "../../shared/Input";
import { SettingsActions } from "../components/SettingsActions";
import {
  settingsInputClassName,
  settingsLabelClassName,
} from "../styles/settings-styles";

export const SecuritySettings = () => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<SecurityFormValues>({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: SecurityFormValues) => {
    console.log(data);

    reset();
  };

  return (
    <div className="space-y-6">
      <SettingsSection>
        <SettingsSectionHeader
          icon={KeyRound}
          title="Password"
          description="Update your password to keep your account secure."
        />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-6">
          <Input
            label="Current password"
            type="password"
            placeholder="Enter your current password"
            {...register("currentPassword")}
            error={errors.currentPassword?.message}
            className={settingsInputClassName}
            labelClassname={settingsLabelClassName}
          />

          <Input
            label="New password"
            type="password"
            placeholder="Enter a new password"
            {...register("newPassword")}
            error={errors.newPassword?.message}
            className={settingsInputClassName}
            labelClassname={settingsLabelClassName}
          />

          <Input
            label="Confirm new password"
            type="password"
            placeholder="Repeat your new password"
            {...register("confirmPassword")}
            error={errors.confirmPassword?.message}
            className={settingsInputClassName}
            labelClassname={settingsLabelClassName}
          />
          <div className="rounded-lg border border-blue-300/40 bg-blue-600/60 p-4">
            <p className="text-xs font-medium text-blue-100">
              Password requirements
            </p>

            <ul className="mt-2 space-y-1 text-xs text-blue-200">
              <li>• At least 8 characters</li>
              <li>• At least one uppercase letter</li>
              <li>• At least one lowercase letter</li>
              <li>• At least one number</li>
            </ul>
          </div>

          <SettingsActions>
            <Button
              type="submit"
              variant="primary"
              disabled={!isDirty || isSubmitting}
            >
              {isSubmitting ? "Changing..." : "Change password"}
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

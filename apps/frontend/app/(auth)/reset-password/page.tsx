"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  ResetPasswordFormValues,
  resetPasswordSchema,
} from "@/lib/forms/schemas/reset-password.schema";
import { useResetPassword } from "@/hooks/auth/useResetPassword";
import {
  settingsInputClassName,
  settingsLabelClassName,
} from "@/app/components/settings/styles/settings-styles";
import {
  PasswordInput,
  ResetPasswordPageLayout,
  ResetPasswordPageHeader,
} from "@/app/components/auth";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token");

  const { actions } = useResetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onChange",
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) return;

    await actions.resetPassword.mutateAsync({
      token,
      newPassword: data.newPassword,
    });

    router.replace("/login");
  };

  if (!token) {
    return (
      <ResetPasswordPageLayout>
        <ResetPasswordPageHeader
          icon={KeyRound}
          title="Invalid reset link"
          description="This password reset link is missing a token or is invalid."
        />

        <Button
          type="button"
          className="w-full"
          onClick={() => router.replace("/forgot-password")}
        >
          Request a new link
        </Button>
      </ResetPasswordPageLayout>
    );
  }

  return (
    <ResetPasswordPageLayout>
      <ResetPasswordPageHeader
        icon={KeyRound}
        title="Reset password"
        description="Enter your new password below."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <PasswordInput
          label="New password"
          type="password"
          placeholder="Enter a new password"
          {...register("newPassword")}
          error={errors.newPassword?.message}
          className={settingsInputClassName}
          labelClassname={settingsLabelClassName}
        />

        <PasswordInput
          label="Confirm new password"
          type="password"
          placeholder="Repeat your new password"
          {...register("confirmPassword")}
          error={errors.confirmPassword?.message}
          className={settingsInputClassName}
          labelClassname={settingsLabelClassName}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={!isValid || actions.resetPassword.isPending}
          isLoading={actions.resetPassword.isPending}
        >
          Reset password
        </Button>
      </form>
    </ResetPasswordPageLayout>
  );
}

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Link from "next/link";

import {
  ResetPasswordFormValues,
  resetPasswordSchema,
} from "@/lib/forms/schemas/reset-password.schema";
import { PASSWORD_RULES_HINT } from "@/lib/forms/schemas/password.schema";
import { useResetPassword } from "@/hooks/auth/useResetPassword";
import { PasswordInput } from "@/app/components/shared/inputs/PasswordInput";
import {
  SecondaryAuthHeader,
  SecondaryAuthLayout,
} from "@/app/components/auth";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { FormAlert } from "@/app/components/shared/FormAlert";
import { getErrorMessage, isApiMessageError } from "@/lib/api/errors";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token");

  const { actions } = useResetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) return;

    try {
      await actions.resetPassword.mutateAsync({
        token,
        newPassword: data.newPassword,
      });
    } catch {
      return;
    }

    router.replace("/");
    router.refresh();
  };

  const resetError = actions.resetPassword.error;

  const linkExpired =
    isApiMessageError(resetError) && resetError.statusCode === 401;

  if (!token) {
    return (
      <SecondaryAuthLayout>
        <SecondaryAuthHeader
          icon={KeyRound}
          title="Invalid reset link"
          description="This password reset link is missing a token or is invalid."
        />

        <Link
          href="/forgot-password"
          className={cn(buttonVariants(), "w-full")}
        >
          Request a new link
        </Link>
      </SecondaryAuthLayout>
    );
  }

  return (
    <SecondaryAuthLayout>
      <SecondaryAuthHeader
        icon={KeyRound}
        title="Reset password"
        description="Enter your new password below."
      />

      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col space-y-4"
      >
        <PasswordInput
          label="New password"
          autoComplete="new-password"
          description={PASSWORD_RULES_HINT}
          {...register("newPassword")}
          error={errors.newPassword?.message}
        />

        {resetError && (
          <FormAlert>
            {getErrorMessage(resetError)}
            {linkExpired && (
              <>
                {" "}
                <Link
                  href="/forgot-password"
                  className="font-medium underline underline-offset-4"
                >
                  Request a new link
                </Link>
              </>
            )}
          </FormAlert>
        )}

        <Button
          type="submit"
          className="w-full"
          isLoading={actions.resetPassword.isPending}
        >
          Reset password
        </Button>
      </form>
    </SecondaryAuthLayout>
  );
}

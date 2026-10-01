"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { useResetPassword } from "@/hooks/auth/useResetPassword";
import { FormAlert } from "@/app/components/shared/FormAlert";
import { getErrorMessage, isApiMessageError } from "@/lib/api/errors";
import {
  ForgotPasswordFormValues,
  forgotPasswordSchema,
} from "@/lib/forms/schemas/reset-password.schema";
import Input from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  SecondaryAuthHeader,
  SecondaryAuthLayout,
} from "@/app/components/auth";

const isNoAccountError = (error: unknown) =>
  isApiMessageError(error) && error.statusCode === 404;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [resent, setResent] = useState(false);

  const { forgotPassword } = useResetPassword().actions;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const formError =
    forgotPassword.error && !isNoAccountError(forgotPassword.error)
      ? getErrorMessage(forgotPassword.error)
      : null;

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    try {
      await forgotPassword.mutateAsync(data);
      setEmail(data.email);
      setSubmitted(true);
    } catch (error: unknown) {
      if (isNoAccountError(error)) {
        setError("email", { message: getErrorMessage(error) });
      }
    }
  };

  const handleResend = () => {
    setResent(false);
    forgotPassword.mutate({ email }, { onSuccess: () => setResent(true) });
  };

  return (
    <SecondaryAuthLayout>
      <SecondaryAuthHeader
        icon={Mail}
        title={submitted ? "Check your email" : "Forgot your password?"}
        description={
          submitted
            ? "We've sent a password reset link to your email address."
            : "Enter your email address and we'll send you a link to reset your password."
        }
      />

      {!submitted ? (
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col space-y-4"
        >
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            {...register("email")}
            error={errors.email?.message}
            disabled={forgotPassword.isPending}
          />

          {formError && <FormAlert>{formError}</FormAlert>}

          <Button
            type="submit"
            className="w-full"
            isLoading={forgotPassword.isPending}
          >
            Send reset link
          </Button>
        </form>
      ) : (
        <div className="space-y-5">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Please check your inbox and follow the link to reset your password.
          </p>

          <div className="space-y-3">
            <p className="text-center text-sm text-muted-foreground">
              Didn&apos;t receive an email?
            </p>

            {formError && <FormAlert>{formError}</FormAlert>}

            <Button
              type="button"
              onClick={handleResend}
              isLoading={forgotPassword.isPending}
              className="w-full"
            >
              Resend reset link
            </Button>

            <p role="status" className="text-center text-sm text-success-text">
              {resent && `We sent another link to ${email}`}
            </p>
          </div>
        </div>
      )}
    </SecondaryAuthLayout>
  );
}

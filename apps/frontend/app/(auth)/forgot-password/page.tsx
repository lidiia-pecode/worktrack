"use client";

import { useState } from "react";
import { Mail } from "lucide-react";

import { settingsInputClassName } from "@/app/components/settings/styles/settings-styles";
import { useResetPassword } from "@/hooks/useResetPassword";
import Input from "@/app/components/shared/Input";
import { Button } from "@/components/ui/button";
import { ResetPasswordPageLayout } from "@/app/components/auth";
import { ResetPasswordPageHeader } from "@/app/components/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { forgotPassword } = useResetPassword().actions;

  const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    await forgotPassword.mutateAsync({ email });
    setSubmitted(true);
  };

  const handleResend = () => {
    forgotPassword.mutate({ email });
  };

  return (
    <ResetPasswordPageLayout>
      <ResetPasswordPageHeader
        icon={Mail}
        title={submitted ? "Check your email" : "Forgot your password?"}
        description={
          submitted
            ? "We've sent a password reset link to your email address."
            : "Enter your email address and we'll send you a link to reset your password."
        }
      />

      {!submitted ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className={settingsInputClassName}
          />

          <Button
            type="submit"
            className="w-full"
            isLoading={forgotPassword.isPending}
            disabled={!email.trim()}
          >
            Send reset link
          </Button>
        </form>
      ) : (
        <div className="space-y-5">
          <p className="text-sm leading-relaxed text-slate-300">
            Please check your inbox and follow the link to reset your password.
          </p>

          <div className="space-y-3">
            <p className="text-center text-sm text-slate-500">
              Didn&apos;t receive the email?
            </p>

            <Button
              type="button"
              onClick={handleResend}
              isLoading={forgotPassword.isPending}
              className="w-full"
            >
              Resend reset link
            </Button>
          </div>
        </div>
      )}
    </ResetPasswordPageLayout>
  );
}

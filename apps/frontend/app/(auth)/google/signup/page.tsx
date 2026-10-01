"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";

import Input from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { AuthCard, AuthFormWrapper } from "@/app/components/auth";
import { FormAlert } from "@/app/components/shared/FormAlert";
import { getErrorMessage, isApiValidationError } from "@/lib/api/errors";
import { applyServerErrors } from "@/lib/forms/utils";
import { cn } from "@/lib/utils/cn";
import { useAuthActions } from "@/hooks/auth/useAuthActions";
import {
  googleSignupSchema,
  type GoogleSignupFormInputs,
} from "@/lib/forms/schemas/auth.schema";

const START_AGAIN_LINK = (
  <Link
    href="/register"
    className={cn(buttonVariants({ variant: "outline" }), "w-full")}
  >
    Start again from sign-up
  </Link>
);

export default function GoogleSignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const actions = useAuthActions();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<GoogleSignupFormInputs>({
    resolver: zodResolver(googleSignupSchema),
    defaultValues: {
      companyName: "",
    },
  });

  const onSubmit = async (data: GoogleSignupFormInputs) => {
    if (!token) return;

    setSubmitError(null);

    try {
      await actions.completeGoogleSignup.mutateAsync({
        token,
        companyName: data.companyName,
      });

      router.replace("/onboarding");
      router.refresh();
    } catch (error: unknown) {
      if (isApiValidationError(error)) {
        applyServerErrors(error, setError);
        return;
      }

      setSubmitError(getErrorMessage(error));
    }
  };

  return (
    <AuthFormWrapper
      badge="Almost there"
      title="Name your company."
      description="You signed in with Google. Add your company's name to finish, and you become its owner."
    >
      {token ? (
        <AuthCard
          title="Finish signing up"
          description="One last step: your company's name."
        >
          <form
            noValidate
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col space-y-4"
          >
            <Input
              label="Company name"
              autoComplete="organization"
              {...register("companyName")}
              error={errors.companyName?.message}
              disabled={isSubmitting}
            />

            {submitError && <FormAlert>{submitError}</FormAlert>}

            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              Complete sign-up
            </Button>

            {submitError && START_AGAIN_LINK}
          </form>
        </AuthCard>
      ) : (
        <AuthCard
          title="Invalid link"
          description="This sign-up link is incomplete. Start again with Google from the sign-up page."
        >
          <Link href="/register" className={cn(buttonVariants(), "w-full")}>
            Start again from sign-up
          </Link>
        </AuthCard>
      )}
    </AuthFormWrapper>
  );
}

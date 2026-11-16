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

const NAME_FIELDS = {
  firstName: { label: "First name", autoComplete: "given-name" },
  lastName: { label: "Last name", autoComplete: "family-name" },
} as const;

type NameField = keyof typeof NAME_FIELDS;

/** What the card asks for: the company, and any name Google didn't share. */
const describeAsked = (askedNames: NameField[]) => {
  if (askedNames.length === 0) return "One last step: your company's name.";

  const missing =
    askedNames.length === 1
      ? NAME_FIELDS[askedNames[0]].label.toLowerCase()
      : "name";
  return `Google didn't share your ${missing}. Add it to finish.`;
};

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
  // Names the server asked for that the address didn't, e.g. on an old link.
  const [refusedNames, setRefusedNames] = useState<NameField[]>([]);
  const askedNames = (Object.keys(NAME_FIELDS) as NameField[]).filter(
    (field) =>
      searchParams.getAll("ask").includes(field) ||
      refusedNames.includes(field),
  );

  const actions = useAuthActions();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<GoogleSignupFormInputs>({
    resolver: zodResolver(googleSignupSchema),
    defaultValues: {
      companyName: "",
      ...Object.fromEntries(askedNames.map((field) => [field, ""])),
    },
  });

  const onSubmit = async (data: GoogleSignupFormInputs) => {
    if (!token) return;

    setSubmitError(null);

    try {
      await actions.completeGoogleSignup.mutateAsync({ token, ...data });

      router.replace("/onboarding");
      router.refresh();
    } catch (error: unknown) {
      if (isApiValidationError(error)) {
        const newlyAsked = (Object.keys(NAME_FIELDS) as NameField[]).filter(
          (field) => error.errors?.[field] && !askedNames.includes(field),
        );
        newlyAsked.forEach((field) => setValue(field, ""));
        setRefusedNames((names) => [...names, ...newlyAsked]);
        applyServerErrors(error, setError);
        return;
      }

      setSubmitError(getErrorMessage(error));
    }
  };

  return (
    <AuthFormWrapper
      title="Name your company."
      description="You signed in with Google. Add your company's name to finish, and you become its owner."
    >
      {token ? (
        <AuthCard
          title="Finish signing up"
          description={describeAsked(askedNames)}
        >
          <form
            noValidate
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col space-y-4"
          >
            {askedNames.map((field) => (
              <Input
                key={field}
                label={NAME_FIELDS[field].label}
                autoComplete={NAME_FIELDS[field].autoComplete}
                {...register(field)}
                error={errors[field]?.message}
                disabled={isSubmitting}
              />
            ))}

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

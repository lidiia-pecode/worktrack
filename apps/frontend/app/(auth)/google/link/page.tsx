"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { Link2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  SecondaryAuthHeader,
  SecondaryAuthLayout,
} from "@/app/components/auth";
import { FormAlert } from "@/app/components/shared/FormAlert";
import { PasswordInput } from "@/app/components/shared/inputs/PasswordInput";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { useAuthActions } from "@/hooks/auth/useAuthActions";
import { getErrorMessage, isApiValidationError } from "@/lib/api/errors";
import { applyServerErrors } from "@/lib/forms/utils";
import {
  GoogleLinkFormInputs,
  googleLinkSchema,
} from "@/lib/forms/schemas/google-link.schema";

export default function GoogleLinkPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const actions = useAuthActions();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<GoogleLinkFormInputs>({
    resolver: zodResolver(googleLinkSchema),
    defaultValues: {
      password: "",
    },
  });

  const onSubmit = async (data: GoogleLinkFormInputs) => {
    if (!token) return;

    setSubmitError(null);

    try {
      await actions.completeGoogleLink.mutateAsync({
        token,
        password: data.password,
      });

      toast.success("Google account linked");
      router.replace("/");
      router.refresh();
    } catch (error: unknown) {
      if (isApiValidationError(error)) {
        applyServerErrors(error, setError);
        return;
      }

      setSubmitError(getErrorMessage(error));
    }
  };

  if (!token) {
    return (
      <SecondaryAuthLayout>
        <SecondaryAuthHeader
          icon={Link2}
          title="Invalid link"
          description="This Google link is incomplete. Continue with Google again from the sign-in page."
        />

        <Link href="/login" className={cn(buttonVariants(), "w-full")}>
          Go to sign in
        </Link>
      </SecondaryAuthLayout>
    );
  }

  return (
    <SecondaryAuthLayout>
      <SecondaryAuthHeader
        icon={Link2}
        title="Link your Google account"
        description="An account with this email already exists. Please enter your password to link your Google account."
      />

      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col space-y-4"
      >
        <PasswordInput
          label="Password"
          autoComplete="current-password"
          {...register("password")}
          error={errors.password?.message}
          disabled={actions.completeGoogleLink.isPending}
        />

        {submitError && <FormAlert>{submitError}</FormAlert>}

        <Button
          type="submit"
          className="w-full"
          isLoading={actions.completeGoogleLink.isPending}
        >
          Link account and sign in
        </Button>
      </form>
    </SecondaryAuthLayout>
  );
}

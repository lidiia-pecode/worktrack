"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { Link2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  SecondaryAuthHeader,
  SecondaryAuthLayout,
} from "@/app/components/auth";
import { PasswordInput } from "@/app/components/shared/inputs/PasswordInput";
import { Button } from "@/components/ui/button";
import { useAuthActions } from "@/hooks/auth/useAuthActions";
import { isApiValidationError } from "@/lib/api/errors";
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
    if (!token) {
      toast.error("Google link token is missing or invalid.");
      router.replace("/login");
      return;
    }

    try {
      await actions.completeGoogleLink.mutateAsync({
        token,
        password: data.password,
      });

      toast.success("Account successfully linked!");
      router.replace("/");
      router.refresh();
    } catch (err: unknown) {
      if (isApiValidationError(err)) {
        applyServerErrors(err, setError);
      }
    }
  };

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

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { AuthFormWrapper } from "@/app/components/auth/components/AuthFormWrapper";
import { PasswordInput } from "@/app/components/auth/components/PasswordInput";
import { Button } from "@/components/ui/button";
import { useAuthActions } from "@/hooks/useAuthActions";
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
      router.push("/login");
      return;
    }

    try {
      await actions.completeGoogleLink.mutateAsync({
        token,
        password: data.password,
      });

      toast.success("Account successfully linked!");
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      if (isApiValidationError(err)) {
        applyServerErrors(err, setError);
      }
    }
  };

  return (
    <AuthFormWrapper
      badge="Account Match Found"
      title="Link your Google Account."
      description="An account with this email already exists. Please enter your password to link your Google account."
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col space-y-4"
      >
        <PasswordInput
          placeholder="Enter your current password"
          {...register("password")}
          error={errors.password?.message}
          disabled={actions.completeGoogleLink.isPending}
        />

        <Button type="submit" isLoading={actions.completeGoogleLink.isPending}>
          Link Account & Sign In
        </Button>
      </form>
    </AuthFormWrapper>
  );
}

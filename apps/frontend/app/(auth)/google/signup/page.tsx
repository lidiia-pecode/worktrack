"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import Input from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthFormWrapper } from "@/app/components/auth/components/AuthFormWrapper";
import { isApiMessageError } from "@/lib/api";
import { useAuthActions } from "@/hooks/auth/useAuthActions";
import {
  googleSignupSchema,
  type GoogleSignupFormInputs,
} from "@/lib/forms/schemas/auth.schema";

export default function GoogleSignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const actions = useAuthActions();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GoogleSignupFormInputs>({
    resolver: zodResolver(googleSignupSchema),
    defaultValues: {
      companyName: "",
    },
  });

  const onSubmit = async (data: GoogleSignupFormInputs) => {
    if (!token) {
      toast.error("Google signup token is missing");
      return;
    }

    try {
      await actions.completeGoogleSignup.mutateAsync({
        token,
        companyName: data.companyName,
      });

      router.replace("/onboarding");
      router.refresh();
    } catch (err: unknown) {
      if (isApiMessageError(err) && typeof err.message === "string") {
        toast.error(err.message);
        return;
      }

      toast.error("Failed to complete Google signup. Please try again.");
    }
  };

  return (
    <AuthFormWrapper
      badge="Almost there"
      title="Create your workspace."
      description="Just add your company name to finish creating your WorkTrack workspace."
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col space-y-4"
      >
        <Input
          placeholder="Company name"
          {...register("companyName")}
          error={errors.companyName?.message}
          disabled={isSubmitting}
        />

        <Button type="submit" isLoading={isSubmitting}>
          Complete signup
        </Button>
      </form>
    </AuthFormWrapper>
  );
}

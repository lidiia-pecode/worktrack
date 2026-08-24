"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import Input from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthFormWrapper } from "@/app/components/auth/components/AuthFormWrapper";
import { useAuthActions } from "@/hooks/useAuthActions";
import { isApiMessageError } from "@/lib/api";

interface GoogleSignupForm {
  companyName: string;
}

export default function GoogleSignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const actions = useAuthActions();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GoogleSignupForm>({
    defaultValues: {
      companyName: "",
    },
  });

  const onSubmit = async (data: GoogleSignupForm) => {
    if (!token) {
      toast.error("Google signup token is missing");
      return;
    }

    try {
      await actions.completeGoogleSignup.mutateAsync({
        token,
        companyName: data.companyName.trim(),
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
      description="Just add your company name to finish creating your Worktrack workspace."
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col space-y-4"
      >
        <Input
          placeholder="Company name"
          {...register("companyName", {
            required: "Company name is required",
            validate: (value) =>
              value.trim().length > 0 || "Company name is required",
          })}
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

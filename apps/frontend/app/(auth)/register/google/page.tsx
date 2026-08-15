"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import Input from "@/app/components/shared/Input";
import { AuthFormWrapper } from "@/app/components/auth/components/AuthFormWrapper";
import { useAuthActions } from "@/hooks/useAuthActions";
import { Button } from "@/components/ui/button";

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
    formState: { errors },
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

    await actions.completeGoogleSignup.mutateAsync({
      token,
      companyName: data.companyName.trim(),
    });

    router.push("/onboarding");
    router.refresh();
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
          disabled={actions.completeGoogleSignup.isPending}
        />

        <Button
          type="submit"
          isLoading={actions.completeGoogleSignup.isPending}
        >
          Complete signup
        </Button>
      </form>
    </AuthFormWrapper>
  );
}

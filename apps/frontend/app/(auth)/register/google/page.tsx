"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import Button from "@/app/components/shared/Button";
import Input from "@/app/components/shared/Input";
import { useAuth } from "@/hooks/useAuth";
import { AuthFormWrapper } from "@/app/components/auth/components/AuthFormWrapper";

interface GoogleSignupForm {
  companyName: string;
}

export default function GoogleSignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token");

  const { actions } = useAuth();

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

    try {
      await actions.completeGoogleSignup.mutateAsync({
        token,
        companyName: data.companyName.trim(),
      });

      router.push("/onboarding");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Unable to complete Google signup");
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

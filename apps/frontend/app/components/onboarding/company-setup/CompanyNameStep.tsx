"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useCompany } from "@/hooks/useCompany";
import Input from "@/components/ui/input";
import {
  CompanyFormValues,
  companySchema,
} from "@/lib/forms/schemas/company.schema";
import { OnboardingStepHeader } from "./OnboardingStepHeader";
import { StepActions } from "./StepActions";

interface StepProps {
  onContinue: () => void;
  onBack: () => void;
  onSkip: () => void;
  showBack?: boolean;
}

export function CompanyNameStep({
  onContinue,
  onBack,
  onSkip,
  showBack = false,
}: StepProps) {
  const { company, actions } = useCompany();
  const isPending = actions.update.isPending;

  const {
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<Pick<CompanyFormValues, "companyName">>({
    resolver: zodResolver(companySchema.pick({ companyName: true })),
    defaultValues: {
      companyName: "",
    },
  });

  useEffect(() => {
    if (!company) return;

    reset({
      companyName: company.companyName ?? "",
    });
  }, [company, reset]);

  const onSubmit = async (data: Pick<CompanyFormValues, "companyName">) => {
    await actions.update.mutateAsync(data);
    onContinue();
  };

  return (
    <div className="space-y-6">
      <OnboardingStepHeader
        title="What is your company name?"
        description="This will be used as the primary display name for your workspace."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Company Name"
          placeholder="Your company name"
          {...register("companyName")}
          error={errors.companyName?.message}
          disabled={isPending}
          autoFocus
        />

        <StepActions
          onBack={onBack}
          onSkip={onSkip}
          showBack={showBack}
          isPending={isPending}
        />
      </form>
    </div>
  );
}

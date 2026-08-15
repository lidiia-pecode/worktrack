"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCompany } from "@/hooks/useCompany";

import Input from "@/app/components/shared/Input";
import { StepActions } from "./StepActions";
import {
  CompanyFormValues,
  companySchema,
} from "@/lib/forms/schemas/company.schema";
import { useEffect } from "react";

interface StepProps {
  onContinue: () => void;
  onBack: () => void;
  onSkip: () => void;
  showBack?: boolean;
}

export const CompanyNameStep = ({
  onContinue,
  onBack,
  onSkip,
  showBack = false,
}: StepProps) => {
  const { company, actions } = useCompany();
  const isPending = actions.update.isPending;

  console.log(company?.companyName);

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          What is your company name?
        </h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          This will be used as the primary display name for your workspace.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Company Name"
          placeholder={company?.companyName}
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
};

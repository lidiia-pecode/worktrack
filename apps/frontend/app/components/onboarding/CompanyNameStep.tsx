"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCompany } from "@/hooks/useCompany";
import {
  updateCompanySchema,
  UpdateCompanyInputs,
} from "@/lib/forms/schemas/workspace.schema";
import Input from "@/app/components/shared/Input";
import Button from "@/app/components/shared/Button";

interface StepProps {
  onContinue: () => void;
  onBack: () => void;
  showBack?: boolean;
}

export function CompanyNameStep({
  onContinue,
  onBack,
  showBack = false,
}: StepProps) {
  const { company, actions } = useCompany();
  const isPending = actions.update.isPending;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Pick<UpdateCompanyInputs, "name">>({
    resolver: zodResolver(updateCompanySchema.pick({ name: true })),
    defaultValues: { name: company?.name || "" },
  });

  const onSubmit = async (data: Pick<UpdateCompanyInputs, "name">) => {
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
          placeholder="Acme Inc."
          {...register("name")}
          error={errors.name?.message}
          disabled={isPending}
          autoFocus
        />

        <div className="flex gap-3 pt-2">
          {showBack && (
            <Button
              type="button"
              variant="secondary"
              onClick={onBack}
              disabled={isPending}
              className="w-1/3"
            >
              Back
            </Button>
          )}
          <Button
            type="submit"
            disabled={isPending}
            isLoading={isPending}
            className={showBack ? "w-2/3" : "w-full"}
          >
            Continue
          </Button>
        </div>
      </form>
    </div>
  );
}

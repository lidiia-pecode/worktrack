"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UpdateCompanyPayload } from "@/types/Company";
import { Button } from "@/components/ui/button";
import Input from "@/app/components/shared/Input";
import { useCompany } from "@/hooks/useCompany";
import { useForm } from "react-hook-form";

// import { WorkspaceStep } from "@/components/onboarding";
// import { TeamStep } ";
// import { ActivitiesStep } ;
// import { ProjectStep } ;

const steps = ["Workspace", "Team", "Activities", "Project"];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  const handleComplete = () => {
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            Worktrack
          </div>
        </div>

        <div className="flex items-center mb-10">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-8 h-8 rounded-full
                    flex items-center justify-center
                    text-sm font-medium
                    ${
                      index <= currentStep
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                    }
                  `}
                >
                  {index + 1}
                </div>

                <span className="mt-2 text-xs text-slate-500">{step}</span>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={`
                    h-px flex-1 mx-3 mb-6
                    ${
                      index < currentStep
                        ? "bg-blue-600"
                        : "bg-slate-200 dark:bg-slate-800"
                    }
                  `}
                />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl p-8">
          {currentStep === 0 && (
            <WorkspaceStep onContinue={() => setCurrentStep(1)} />
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          You can change these settings later.
        </p>
      </div>
    </main>
  );
}

interface WorkspaceStepProps {
  onContinue: () => void;
}

export function WorkspaceStep({ onContinue }: WorkspaceStepProps) {
  const { company, query, actions } = useCompany();

  const form = useForm<UpdateCompanyPayload>({
    values: company
      ? {
          name: company.name,
          timezone: company.timezone,
          currency: company.currency,
          weekStartDay: company.weekStartDay,
          standardWorkHoursPerDay: company.standardWorkHoursPerDay,
        }
      : undefined,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  const onSubmit = async (data: UpdateCompanyPayload) => {
    await actions.update.mutateAsync(data);

    onContinue();
  };

  if (query.isLoading) {
    return (
      <div className="py-10 text-center text-sm text-slate-500">
        Loading workspace settings...
      </div>
    );
  }

  if (query.isError || !company) {
    return (
      <div className="py-10 text-center text-sm text-red-500">
        Unable to load workspace settings.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Set up your workspace
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Review your workspace settings before getting started.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          placeholder="Company name"
          {...register("name")}
          error={errors.name?.message}
          disabled={actions.update.isPending}
        />

        <div>
          <label className="block text-sm font-medium mb-2">Timezone</label>

          <select
            {...register("timezone")}
            disabled={actions.update.isPending}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-4 py-2.5"
          >
            <option value="UTC">UTC</option>
            <option value="Europe/Kyiv">Europe/Kyiv</option>
            <option value="Europe/London">Europe/London</option>
            <option value="America/New_York">America/New_York</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Currency</label>

          <select
            {...register("currency")}
            disabled={actions.update.isPending}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-4 py-2.5"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="UAH">UAH</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Working hours per day
          </label>

          <Input
            type="number"
            min={1}
            max={24}
            {...register("standardWorkHoursPerDay", {
              valueAsNumber: true,
            })}
            error={errors.standardWorkHoursPerDay?.message}
            disabled={actions.update.isPending}
          />
        </div>

        <Button
          type="submit"
          disabled={actions.update.isPending}
          isLoading={actions.update.isPending}
        >
          Continue
        </Button>
      </form>
    </div>
  );
}

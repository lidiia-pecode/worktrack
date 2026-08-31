"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { CompanyNameStep } from "@/app/components/onboarding/company-setup/CompanyNameStep";
import { TimezoneStep } from "@/app/components/onboarding/company-setup/TimezoneStep";
import { CurrencyStep } from "@/app/components/onboarding/company-setup/CurrencyStep";
import { WorkHoursStep } from "@/app/components/onboarding/company-setup/WorkHoursStep";
import { OnboardingProgress } from "@/app/components/onboarding/company-setup/OnboardingProgress";

import { useCompany } from "@/hooks/auth/useCompany";

const STEPS = ["Workspace", "Timezone", "Currency", "Hours"] as const;

export default function OnboardingPage() {
  const router = useRouter();

  const { query } = useCompany();
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep === STEPS.length - 1) {
      router.replace("/");
      router.refresh();
      return;
    }

    setCurrentStep((step) => step + 1);
  };

  const handleBack = () => {
    setCurrentStep((step) => Math.max(step - 1, 0));
  };

  const handleSkip = () => {
    router.replace("/");
    router.refresh();
  };

  if (query.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="animate-pulse text-sm font-medium text-muted-foreground">
          Loading your workspace...
        </p>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-8 sm:px-8 lg:px-10">
        <div className="flex flex-1 flex-col justify-center py-12 w-full">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Let&apos;s get you started
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Set up a few basics to get your workspace ready.
            </p>
          </div>

          <OnboardingProgress steps={STEPS} currentStep={currentStep} />

          <div className="mt-8 rounded-2xl border border-border/80 bg-card/90 p-7 shadow-[0_24px_70px_-35px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:p-8">
            {currentStep === 0 && (
              <CompanyNameStep
                onContinue={handleNext}
                onBack={handleBack}
                onSkip={handleSkip}
                showBack={false}
              />
            )}

            {currentStep === 1 && (
              <TimezoneStep
                onContinue={handleNext}
                onBack={handleBack}
                onSkip={handleSkip}
              />
            )}

            {currentStep === 2 && (
              <CurrencyStep
                onContinue={handleNext}
                onBack={handleBack}
                onSkip={handleSkip}
              />
            )}

            {currentStep === 3 && (
              <WorkHoursStep
                onContinue={handleNext}
                onBack={handleBack}
                onSkip={handleSkip}
              />
            )}
          </div>
        </div>

        <p className="pb-2 text-center text-xs text-muted-foreground">
          You can update these preferences later in your workspace settings.
        </p>
      </div>
    </main>
  );
}

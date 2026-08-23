"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { useCompany } from "@/hooks/useCompany";
import { Button } from "@/components/ui/button";
import { Logo } from "@/app/components/shared/Logo";

import { CompanyNameStep } from "@/app/components/onboarding/company-setup/CompanyNameStep";
import { TimezoneStep } from "@/app/components/onboarding/company-setup/TimezoneStep";
import { CurrencyStep } from "@/app/components/onboarding/company-setup/CurrencyStep";
import { WorkHoursStep } from "@/app/components/onboarding/company-setup/WorkHoursStep";
import { OnboardingProgress } from "@/app/components/onboarding/company-setup/OnboardingProgress";

const STEPS = ["Company", "Timezone", "Currency", "Hours"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { query } = useCompany();

  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((step) => step + 1);
      return;
    }

    setIsCompleted(true);
  };

  const handleBack = () => {
    setCurrentStep((step) => Math.max(step - 1, 0));
  };

  const handleSkip = () => {
    setIsCompleted(true);
  };

  const handleFinish = () => {
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
      {/* Ambient background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-secondary/20 blur-[130px]" />

        <div className="absolute -bottom-48 -right-32 h-[560px] w-[560px] rounded-full bg-secondary/15 blur-[140px]" />

        <div className="absolute left-1/2 top-[20%] h-[420px] w-[620px] -translate-x-1/2 rounded-full bg-brand/5 blur-[150px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-8 sm:px-8 lg:px-10">
        {/* Header */}
        <header className="flex items-center justify-between">
          <Logo />

          {!isCompleted && (
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Skip setup
            </button>
          )}
        </header>

        {/* Main */}
        <div className="flex flex-1 flex-col justify-center py-12">
          {!isCompleted ? (
            <div className="w-full">
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
          ) : (
            <div className="w-full rounded-2xl border border-border/80 bg-card/90 p-8 text-center shadow-[0_24px_70px_-35px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:p-10">
              <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <CheckCircle2 className="size-8" />
              </div>

              <div className="mx-auto mt-6 max-w-md">
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Workspace ready
                </h1>

                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Your workspace configuration has been successfully saved. You
                  can now start tracking time and managing projects.
                </p>
              </div>

              <Button
                onClick={handleFinish}
                size="lg"
                className="group mt-8 w-full"
              >
                Go to Dashboard
                <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          )}
        </div>

        <p className="pb-2 text-center text-xs text-muted-foreground">
          You can change these settings later in your workspace settings.
        </p>
      </div>
    </main>
  );
}

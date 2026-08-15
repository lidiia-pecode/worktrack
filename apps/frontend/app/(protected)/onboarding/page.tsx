"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ArrowRight } from "lucide-react";

import { useCompany } from "@/hooks/useCompany";

import { TimezoneStep } from "@/app/components/onboarding/TimezoneStep";
import { CurrencyStep } from "@/app/components/onboarding/CurrencyStep";
import { WorkHoursStep } from "@/app/components/onboarding/WorkHoursStep";
import { Button } from "@/components/ui/button";
import { CompanyNameStep } from "@/app/components/onboarding/CompanyNameStep";

const STEPS = ["Company", "Timezone", "Currency", "Hours"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const { query } = useCompany();

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleFinish = () => {
    router.push("/dashboard");
    router.refresh();
  };

  if (query.isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-sm font-medium text-slate-500 animate-pulse">
          Loading your workspace...
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 py-12 flex flex-col justify-between transition-colors">
      <div className="max-w-xl mx-auto w-full">
        {/* Header / Brand & Global Skip option */}
        <div className="flex items-center justify-between mb-10">
          <div className="w-16" />
          <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">
            Worktrack
          </span>
          {!isCompleted && (
            <button
              onClick={() => setIsCompleted(true)}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              Skip setup
            </button>
          )}
        </div>

        {!isCompleted ? (
          <>
            {/* Stepper Progress Indicator */}
            <div className="flex items-center mb-8 px-2">
              {STEPS.map((step, index) => {
                const isStepCompleted = index < currentStep;
                const isCurrent = index === currentStep;

                return (
                  <div
                    key={step}
                    className="flex items-center flex-1 last:flex-none"
                  >
                    <div className="flex flex-col items-center group">
                      <div
                        className={`
                          w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200
                          ${
                            isStepCompleted || isCurrent
                              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-4 ring-blue-500/10"
                              : "bg-slate-100 dark:bg-slate-900 text-slate-400 border border-slate-200 dark:border-slate-800"
                          }
                        `}
                      >
                        {index + 1}
                      </div>
                      <span
                        className={`mt-2 text-xs font-medium transition-colors ${
                          isCurrent
                            ? "text-slate-900 dark:text-white"
                            : "text-slate-400 dark:text-slate-500"
                        }`}
                      >
                        {step}
                      </span>
                    </div>

                    {index < STEPS.length - 1 && (
                      <div
                        className={`
                          h-0.5 flex-1 mx-3 mb-6 transition-colors duration-200
                          ${
                            index < currentStep
                              ? "bg-blue-600"
                              : "bg-slate-200 dark:bg-slate-800"
                          }
                        `}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Step Card Container */}
            <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl shadow-slate-900/5 p-8 transition-all">
              {currentStep === 0 && (
                <CompanyNameStep
                  onContinue={handleNext}
                  onBack={handleBack}
                  onSkip={handleNext}
                  showBack={false}
                />
              )}
              {currentStep === 1 && (
                <TimezoneStep
                  onContinue={handleNext}
                  onBack={handleBack}
                  onSkip={handleNext}
                />
              )}
              {currentStep === 2 && (
                <CurrencyStep
                  onContinue={handleNext}
                  onBack={handleBack}
                  onSkip={handleNext}
                />
              )}
              {currentStep === 3 && (
                <WorkHoursStep
                  onContinue={handleNext}
                  onBack={handleBack}
                  onSkip={handleNext}
                />
              )}
            </div>
          </>
        ) : (
          /* Success Finish State Card */
          <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl shadow-slate-900/5 p-8 text-center space-y-6 transition-all animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-500/10 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Workspace Ready!
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Your workspace configuration has been successfully saved. You
                can now dive into tracking time and managing projects.
              </p>
            </div>

            <Button onClick={handleFinish} className="w-full group">
              <span>Go to Dashboard</span>
              <ArrowRight
                size={16}
                className="ml-2 transition-transform group-hover:translate-x-1"
              />
            </Button>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6">
          You can change these settings later in your workspace settings.
        </p>
      </div>
    </main>
  );
}

interface OnboardingProgressProps {
  steps: readonly string[];
  currentStep: number;
}

export function OnboardingProgress({
  steps,
  currentStep,
}: OnboardingProgressProps) {
  return (
    <div className="flex items-start">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <div key={step} className="flex flex-1 items-start last:flex-none">
            <div className="flex min-w-0 flex-col items-center">
              <div
                className={[
                  "flex size-9 items-center justify-center rounded-full",
                  "text-xs font-semibold transition-all duration-200",
                  isCompleted || isCurrent
                    ? "bg-brand text-brand-foreground shadow-lg shadow-glow-primary/20"
                    : "border border-border bg-muted/50 text-muted-foreground",
                ].join(" ")}
              >
                {index + 1}
              </div>

              <span
                className={[
                  "mt-2 text-xs font-medium transition-colors",
                  isCurrent ? "text-foreground" : "text-muted-foreground",
                ].join(" ")}
              >
                {step}
              </span>
            </div>

            {index < steps.length - 1 && (
              <div
                className={[
                  "mx-3 mt-[18px] h-px flex-1 transition-colors duration-200",
                  index < currentStep ? "bg-brand" : "bg-border",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

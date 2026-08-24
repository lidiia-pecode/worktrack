interface OnboardingStepHeaderProps {
  title: string;
  description: string;
}

export function OnboardingStepHeader({
  title,
  description,
}: OnboardingStepHeaderProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        {title}
      </h1>

      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

interface OnboardingStepHeaderProps {
  title: string;
  description: string;
}

export const OnboardingStepHeader = ({
  title,
  description,
}: OnboardingStepHeaderProps) => {
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-foreground">
        {title}
      </h2>

      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
};

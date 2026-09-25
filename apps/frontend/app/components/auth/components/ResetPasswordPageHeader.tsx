import { ArrowLeft, LucideIcon } from "lucide-react";
import Link from "next/link";

interface ResetPasswordPageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const ResetPasswordPageHeader = ({
  icon: Icon,
  title,
  description,
}: ResetPasswordPageHeaderProps) => {
  return (
    <div className="mb-7">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-brand-subtle text-brand">
          <Icon className="h-5 w-5" />
        </div>

        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>
      </div>

      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>

        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
};

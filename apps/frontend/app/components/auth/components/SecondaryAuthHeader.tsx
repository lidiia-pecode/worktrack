import { ArrowLeft, LucideIcon } from "lucide-react";
import Link from "next/link";

interface SecondaryAuthHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const SecondaryAuthHeader = ({
  icon: Icon,
  title,
  description,
}: SecondaryAuthHeaderProps) => {
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
          Back to sign in
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
};

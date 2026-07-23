import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type FormSectionProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

export function FormSection({ label, children, className }: FormSectionProps) {
  return (
    <section className={cn("space-y-2", className)}>
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
        {label}
      </p>
      {children}
    </section>
  );
}

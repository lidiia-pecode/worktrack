import React from "react";

import { Logo } from "../../shared/Logo";
import { GlowBackground } from "@/components/ui/glow-background";

interface AuthFormWrapperProps {
  children: React.ReactNode;
  badge: string;
  title: string;
  description: string;
}

export const AuthFormWrapper = ({
  children,
  badge,
  title,
  description,
}: AuthFormWrapperProps) => {
  return (
    <main className="min-h-screen w-full bg-background lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-foreground text-background lg:flex lg:flex-col lg:px-14 lg:py-10 xl:px-20">
        <GlowBackground variant="auth" />

        <div className="relative z-10">
          <Logo />
        </div>

        <div className="relative z-10 my-auto -translate-y-10 max-w-xl py-20 xl:-translate-y-14">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-brand/35 bg-brand/10 px-3.5 py-1.5 text-xs font-medium tracking-wide text-brand-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            {badge}
          </div>

          <h1 className="max-w-xl text-5xl font-bold leading-[1.06] tracking-[-0.035em] text-background xl:text-6xl">
            {title}
          </h1>

          <p className="mt-6 max-w-lg text-base leading-7 text-secondary xl:text-lg">
            {description}
          </p>
        </div>

        <div className="relative z-10 max-w-md">
          <div className="flex items-center gap-4 rounded-2xl border border-secondary/25 bg-secondary/10 px-4 py-4 backdrop-blur-sm">
            <div className="flex -space-x-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-foreground bg-brand text-xs font-bold text-brand-foreground">
                JD
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-foreground bg-brand-secondary text-xs font-bold text-brand-foreground">
                AS
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-foreground bg-secondary text-xs font-bold text-secondary-foreground">
                +8k
              </div>
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold text-background">
                Trusted by modern teams
              </p>

              <p className="mt-0.5 text-xs text-secondary">
                Over 120,000+ hours tracked this month
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-12 sm:px-10 lg:px-12 xl:px-20">
        <div className="relative z-10 w-full max-w-120">{children}</div>
      </section>
    </main>
  );
};

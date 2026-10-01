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
    <div className="min-h-screen w-full bg-background lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-foreground text-background lg:flex lg:flex-col lg:px-14 lg:py-10 xl:px-20">
        <GlowBackground variant="auth" />

        <div className="relative z-10">
          <Logo onDark />
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
      </section>

      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-8 sm:px-10 sm:py-12 lg:px-12 xl:px-20">
        <div className="relative z-10 w-full max-w-120">
          <header className="mb-8 lg:hidden">
            <Logo />

            <h1 className="mt-8 text-3xl font-bold tracking-tight text-foreground">
              {title}
            </h1>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </header>

          {children}
        </div>
      </section>
    </div>
  );
};

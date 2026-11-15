import React from "react";

import { Logo } from "../../shared/Logo";
import { GlowBackground } from "@/components/ui/glow-background";

interface AuthFormWrapperProps {
  children: React.ReactNode;
  title: string;
  description: string;
}

export const AuthFormWrapper = ({
  children,
  title,
  description,
}: AuthFormWrapperProps) => {
  return (
    <main className="min-h-screen w-full bg-background lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-foreground text-background lg:flex lg:flex-col lg:px-14 lg:py-10 xl:px-20">
        <GlowBackground />

        <div className="relative z-10">
          <Logo onDark />
        </div>

        <div className="relative z-10 my-auto -translate-y-10 max-w-xl py-20 xl:-translate-y-14">
          <h1 className="max-w-xl text-5xl font-bold leading-[1.06] tracking-[-0.035em] text-background xl:text-6xl">
            {title}
          </h1>

          <p className="mt-6 max-w-lg text-base leading-7 text-brand-mist xl:text-lg">
            {description}
          </p>
        </div>
      </section>

      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-8 sm:px-10 sm:py-12 lg:px-12 xl:px-20">
        <div className="relative z-10 w-full max-w-120">
          {/* Without the dark panel only the logo and the form show; the
              panel's heading stays as the page's h1 for screen readers. */}
          <header className="mb-8 lg:hidden">
            <Logo />

            <h1 className="sr-only">{title}</h1>
          </header>

          {children}
        </div>
      </section>
    </main>
  );
};

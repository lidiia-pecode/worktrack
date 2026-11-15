import React from "react";

import { Logo } from "../../shared/Logo";
import { BrandPattern } from "@/components/ui/brand-pattern";

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
    <main className="min-h-screen w-full bg-background lg:grid lg:grid-cols-[2fr_3fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-brand-deep text-brand-foreground lg:flex lg:flex-col lg:px-12 lg:py-10 xl:px-16">
        <BrandPattern tone="onBrand" />

        <div className="relative z-10">
          <Logo onBrand />
        </div>

        <div className="relative z-10 my-auto -translate-y-10 max-w-md py-20 xl:-translate-y-14">
          <h1 className="text-4xl font-bold leading-[1.06] tracking-[-0.035em] text-balance xl:text-5xl">
            {title}
          </h1>

          <p className="mt-6 text-base leading-7 text-brand-foreground-muted xl:text-lg">
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
    </main>
  );
};

import type { ReactNode } from "react";

import { BrandPattern } from "@/components/ui/brand-pattern";

import { AuthCard } from "./AuthCard";

interface SecondaryAuthLayoutProps {
  children: ReactNode;
}

export const SecondaryAuthLayout = ({ children }: SecondaryAuthLayoutProps) => (
  <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12 sm:px-6">
    <BrandPattern />

    <div className="relative z-10 w-full max-w-md">
      <AuthCard>{children}</AuthCard>
    </div>
  </main>
);

import type { ReactNode } from "react";

import { Logo } from "../../shared/Logo";
import { BrandPattern } from "@/components/ui/brand-pattern";

import { AuthCard } from "./AuthCard";

interface SecondaryAuthLayoutProps {
  children: ReactNode;
}

// The logo sits above the card, where the split auth pages show it on a
// phone, so every page before sign-in carries the mark in the same place.
export const SecondaryAuthLayout = ({ children }: SecondaryAuthLayoutProps) => (
  <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12 sm:px-6">
    <BrandPattern />

    <div className="relative z-10 w-full max-w-md">
      <div className="mb-8">
        <Logo />
      </div>

      <AuthCard>{children}</AuthCard>
    </div>
  </main>
);

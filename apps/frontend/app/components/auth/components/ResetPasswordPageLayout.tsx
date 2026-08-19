import type { ReactNode } from "react";

import { GlowBackground } from "@/components/ui/glow-background";

interface ResetPasswordPageLayoutProps {
  children: ReactNode;
}

export const ResetPasswordPageLayout = ({
  children,
}: ResetPasswordPageLayoutProps) => {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-6 text-white">
      <GlowBackground intensity="strong" />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-8 pb-10 backdrop-blur-xl">
        {children}
      </div>
    </div>
  );
};

// components/auth/AuthLayout.tsx

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
    <main className="flex min-h-screen w-full bg-[#FAF9F6] dark:bg-[#0E1015]">
      <div className="relative hidden overflow-hidden border-r border-white/10 bg-slate-950 px-16 py-12 text-white lg:flex lg:w-1/2 lg:flex-col lg:justify-between">
        <GlowBackground intensity="default" className="z-0" />

        <div className="relative z-10">
          <Logo />
        </div>

        <div className="relative z-10 my-auto max-w-md space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-mono uppercase tracking-wider text-blue-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
            {badge}
          </div>

          <h1 className="text-4xl font-bold leading-[1.15] tracking-tight xl:text-5xl">
            {title}
          </h1>

          <p className="text-base leading-relaxed text-slate-400 xl:text-lg">
            {description}
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md">
          <div className="flex -space-x-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-slate-950 bg-gradient-to-tr from-blue-600 to-cyan-500 text-xs font-bold">
              JD
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-slate-950 bg-gradient-to-tr from-indigo-600 to-purple-500 text-xs font-bold">
              AS
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-slate-950 bg-gradient-to-tr from-blue-500 to-indigo-600 text-xs font-bold">
              +8k
            </div>
          </div>

          <div className="text-xs">
            <p className="font-medium text-slate-200">
              Trusted by modern teams
            </p>

            <p className="text-slate-400">
              Over 120,000+ hours tracked this month
            </p>
          </div>
        </div>
      </div>

      <div className="flex w-full items-center justify-center px-6 py-16 lg:w-1/2 lg:px-20">
        <div className="w-full max-w-[420px]">{children}</div>
      </div>
    </main>
  );
};

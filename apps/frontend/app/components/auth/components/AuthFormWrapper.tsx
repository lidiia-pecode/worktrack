// components/auth/AuthLayout.tsx

import React from "react";
import { Logo } from "../../shared/Logo";

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
    <main className="min-h-screen w-full flex bg-[#FAF9F6] dark:bg-[#0E1015]">
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between overflow-hidden bg-slate-950 border-r border-white/10 px-16 py-12 text-white">
        <div className="pointer-events-none absolute -top-24 -left-24 h-[500px] w-[500px] rounded-full bg-blue-600/15 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-[400px] w-[400px] rounded-full bg-indigo-600/10 blur-[100px]" />

        <Logo />

        <div className="relative z-10 max-w-md space-y-6 my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            {badge}
          </div>
          <h1 className="text-4xl xl:text-5xl font-bold tracking-tight leading-[1.15]">
            {title}
          </h1>
          <p className="text-slate-400 text-base xl:text-lg leading-relaxed">
            {description}
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
          <div className="flex -space-x-2">
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-xs font-bold border-2 border-slate-950">
              JD
            </div>
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-xs font-bold border-2 border-slate-950">
              AS
            </div>
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold border-2 border-slate-950">
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

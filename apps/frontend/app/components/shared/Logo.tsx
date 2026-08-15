"use client";

import Link from "next/link";

export const Logo = () => (
  <Link href="/" className="relative z-10 flex items-center gap-3 w-fit group">
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 font-bold text-white shadow-lg shadow-blue-500/25 transition-transform group-hover:scale-105">
      W
    </div>
    <span className="text-xl font-semibold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
      Worktrack
    </span>
  </Link>
);

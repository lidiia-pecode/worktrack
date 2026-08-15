"use client";

import { motion } from "framer-motion";
import Link from "next/link";

import { GlowBackground } from "@/components/ui/glow-background";
import { Logo } from "../shared/Logo";

export const LandingPage = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020617] text-white">
      <GlowBackground intensity="default" />

      <div className="relative z-10">
        <nav className="flex items-center justify-between border-b border-white/10 px-12 py-6">
          <Logo />

          <div className="flex items-center gap-6">
            <Link
              href="/login"
              className="text-sm font-medium transition hover:text-blue-400"
            >
              Log in
            </Link>

            <Link
              href="/register"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-blue-50"
            >
              Sign up free
            </Link>
          </div>
        </nav>

        <section className="relative overflow-hidden pb-32 pt-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="relative z-10 container mx-auto max-w-7xl px-6"
          >
            <h1 className="mb-8 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-7xl font-bold tracking-tight text-transparent">
              Your team`s flow, unified.
            </h1>

            <p className="mx-auto mb-10 max-w-3xl text-2xl leading-relaxed text-slate-400">
              Stop guessing, start shipping. The project tracker that feels like
              a shortcut to productivity.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="container relative z-10 mx-auto mt-16 px-6"
          >
            <div className="relative rounded-2xl border border-white/10 bg-slate-900/50 p-2 shadow-2xl">
              <div className="bg-time-management h-60" />

              <div className="absolute -inset-1 -z-10 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 opacity-20 blur-xl" />
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
};

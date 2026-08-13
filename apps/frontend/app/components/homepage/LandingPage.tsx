"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { Logo } from "../shared/Logo";

export const LandingPage = () => {
  return (
    <div className="bg-[#020617] text-white min-h-screen">
      <nav className="flex justify-between items-center py-6 px-12 border-b border-white/10">
        <Logo />
        <div className="flex gap-6 items-center">
          <Link
            href="/login"
            className="text-sm font-medium hover:text-blue-400 transition"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="text-sm px-5 py-2.5 bg-white text-black rounded-full font-semibold hover:bg-blue-50 transition"
          >
            Sign up free
          </Link>
        </div>
      </nav>

      <section className="relative pt-24 pb-32 overflow-hidden text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="container max-w-7xl mx-auto px-6 z-10 relative"
        >
          <h1 className="text-7xl font-bold tracking-tight mb-8 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
            Your team`s flow, unified.
          </h1>
          <p className="text-2xl text-slate-400 mb-10 max-w-3xl mx-auto leading-relaxed">
            Stop guessing, start shipping. The project tracker that feels like a
            shortcut to productivity.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="mt-16 container mx-auto px-6"
        >
          <div className="relative rounded-2xl border border-white/10 bg-slate-900/50 p-2 shadow-2xl">
            <div className="bg-time-management h-60"></div>
            <div className="absolute -inset-1 bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-2xl opacity-20 blur-xl -z-10" />
          </div>
        </motion.div>
      </section>
    </div>
  );
};

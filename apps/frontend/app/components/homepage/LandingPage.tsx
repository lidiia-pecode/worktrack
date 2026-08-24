"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";

import { Logo } from "../shared/Logo";

const FLOW_STAGES = [
  {
    name: "Backlog",
    count: "12",
    dot: "bg-muted-foreground/50",
    tasks: ["Redesign onboarding", "Audit unused flags", "Q3 roadmap draft"],
  },
  {
    name: "In Progress",
    count: "5",
    dot: "bg-brand",
    tasks: ["API migration", "Fix mobile nav", "Design QA pass"],
  },
  {
    name: "In Review",
    count: "3",
    dot: "bg-warning",
    tasks: ["Pricing page copy", "Sprint retro doc"],
  },
  {
    name: "Done",
    count: "28",
    dot: "bg-success",
    tasks: ["Ship v2.4", "Onboarding emails", "Cache layer fix"],
  },
] as const;

const STEPS = [
  {
    number: "01",
    title: "Plan",
    description:
      "Turn a messy backlog into a week your team actually agrees on.",
  },
  {
    number: "02",
    title: "Track",
    description: "Watch work move in real time — no status meeting required.",
  },
  {
    number: "03",
    title: "Ship",
    description:
      "Every finished task rolls into a release note, automatically.",
  },
] as const;

export const LandingPage = () => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="relative z-10">
        <header className="px-6 pt-4 lg:px-10">
          <nav className="mx-auto flex max-w-[1600px] items-center justify-between rounded-2xl border border-border/70 bg-card/85 px-6 py-4 shadow-sm backdrop-blur-xl lg:px-8">
            <Logo />

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors hover:border-brand/40 hover:bg-secondary/30"
              >
                Log in
              </Link>

              <Link
                href="/register"
                className="inline-flex h-10 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-brand-foreground shadow-lg shadow-glow-primary transition-all hover:bg-brand/90"
              >
                Sign up free
              </Link>
            </div>
          </nav>
        </header>

        <section className="relative px-6 pb-24 pt-24 lg:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-3.5 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-brand-secondary">
              <span className="animate-glow-pulse h-1.5 w-1.5 rounded-full bg-brand" />
              For teams shipping every week
            </div>

            <h1 className="text-4xl font-bold leading-[1.05] tracking-[-0.035em] text-foreground sm:text-6xl lg:text-[4.5rem]">
              Your team&apos;s flow,
              <br className="hidden sm:block" /> unified.
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
              WorkTrack turns scattered tasks, threads, and to-dos into one line
              you can actually see moving — from backlog to done.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center rounded-full bg-brand px-7 text-sm font-semibold text-brand-foreground shadow-lg shadow-glow-primary transition-all hover:bg-brand/90"
              >
                Start free
              </Link>
              <a
                href="#flow"
                className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-card px-7 text-sm font-semibold text-foreground transition-colors hover:border-brand/40 hover:bg-secondary/30"
              >
                See how it works
              </a>
            </div>

            <p className="mt-4 font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground/70">
              No credit card · cancel anytime
            </p>
          </motion.div>

          {/* Signature element: a live flow visualization of a real kanban board */}
          <motion.div
            id="flow"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8 }}
            className="relative mx-auto mt-20 max-w-6xl scroll-mt-24"
          >
            <div className="relative overflow-hidden rounded-2xl border border-border bg-secondary/20 p-6 shadow-[0_24px_70px_-35px_rgba(57,61,63,0.45)] backdrop-blur-sm sm:p-10">
              <div className="mb-8 flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  This week&apos;s board
                </span>
                <span className="font-mono text-xs text-muted-foreground/70">
                  48 tasks · 6 people
                </span>
              </div>

              <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-5">
                {FLOW_STAGES.map((stage, i) => (
                  <motion.div
                    key={stage.name}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.08 }}
                    className="flex flex-col gap-2.5"
                  >
                    <div className="flex items-center gap-2 pb-1">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${stage.dot}`}
                      />
                      <span className="text-xs font-semibold text-foreground">
                        {stage.name}
                      </span>
                      <span className="ml-auto font-mono text-[11px] text-muted-foreground/70">
                        {stage.count}
                      </span>
                    </div>

                    {stage.tasks.map((task) => (
                      <div
                        key={task}
                        className="rounded-lg border border-border bg-card px-3 py-2.5 text-[13px] font-medium leading-snug text-foreground shadow-sm"
                      >
                        {task}
                      </div>
                    ))}
                  </motion.div>
                ))}
              </div>

              {/* A task, traveling the line — the literal "flow" the headline promises */}
              <div className="relative mt-9 h-px w-full bg-border">
                {!shouldReduceMotion && (
                  <motion.span
                    aria-hidden="true"
                    className="absolute -top-[3px] h-[7px] w-[7px] rounded-full bg-brand"
                    style={{ boxShadow: "0 0 14px 3px var(--glow-primary)" }}
                    animate={{ left: ["0%", "97%"] }}
                    transition={{
                      duration: 7,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                )}
              </div>
            </div>

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-3 -z-10 rounded-2xl bg-brand/10 blur-2xl"
            />
          </motion.div>
        </section>

        <section className="px-6 pb-28">
          <div className="mx-auto grid max-w-5xl gap-10 sm:grid-cols-3 sm:gap-8">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <span className="font-mono text-sm text-brand-secondary/70">
                  {step.number}
                </span>
                <h3 className="mt-2 text-xl font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-[15px] leading-6 text-muted-foreground">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};

"use client";

import {
  BarChart3,
  BriefcaseBusiness,
  CalendarClock,
  CalendarDays,
  Mail,
  Palmtree,
  Users,
} from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { GlowBackground } from "@/components/ui/glow-background";
import { cn } from "@/lib/utils/cn";

import { Logo } from "../shared/Logo";
import { ProductIllustration } from "./ProductIllustration";

const BENEFITS_SECTION_ID = "benefits";
const GETTING_STARTED_SECTION_ID = "getting-started";

const NAV_LINKS = [
  { href: `#${BENEFITS_SECTION_ID}`, label: "What it does" },
  { href: `#${GETTING_STARTED_SECTION_ID}`, label: "Getting started" },
] as const;

const BENEFITS = [
  {
    icon: Users,
    title: "Teams at a glance",
    description:
      "Group people into teams. Each team's manager sees who has logged their week, who is short and where the time went.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Projects and activities",
    description:
      "Keep client work and internal projects apart, and break the hours down by the kind of work done.",
  },
  {
    icon: CalendarDays,
    title: "A simple weekly timesheet",
    description:
      "Everyone logs the whole week in one view, by project and activity, and marks each entry billable or not.",
  },
  {
    icon: CalendarClock,
    title: "Planning ahead",
    description:
      "Plan who works on what in the coming weeks, then compare the plan with the time actually logged.",
  },
  {
    icon: Palmtree,
    title: "Absences that explain the gaps",
    description:
      "Vacation, sick leave and public holidays lower the expected hours, so a short week never reads as missing time.",
  },
  {
    icon: BarChart3,
    title: "Reports you can invoice from",
    description:
      "Hours by client, project, activity or person, exported to Excel. Past months lock, so invoiced hours stay as they were.",
  },
] as const;

const STEPS = [
  {
    title: "Create your company",
    description:
      "Set the time zone and working day, then add your teams, projects and activities.",
  },
  {
    title: "Invite your people",
    description:
      "Send invitations by email. Each person joins through the link in theirs.",
  },
  {
    title: "Track and understand",
    description:
      "Time is logged week by week, and reports show where the hours went.",
  },
] as const;

// The hero's controls on the dark ground: quiet text that lights up, and an
// outline drawn in the background colour.
const ON_DARK_GHOST_CLASS =
  "text-brand-mist hover:bg-background/10 hover:text-background";
const ON_DARK_OUTLINE_CLASS =
  "border-background/30 text-background hover:bg-background/10 hover:text-background";

const SECTION_TITLE_CLASS =
  "text-2xl font-semibold tracking-tight text-foreground sm:text-3xl";

// Sits over the dark hero rather than sticking to the top, so it is never a
// dark bar over the light sections below.
const LandingHeader = () => (
  <header className="absolute inset-x-0 top-0 z-10">
    <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4 lg:px-10">
      <Logo onDark />

      <nav aria-label="Page sections" className="hidden sm:block">
        <ul className="flex items-center gap-2">
          {NAV_LINKS.map(({ href, label }) => (
            <li key={href}>
              <a
                href={href}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  ON_DARK_GHOST_CLASS,
                )}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  </header>
);

export const LandingPage = () => (
  <div className="relative min-h-full bg-background text-foreground">
    <LandingHeader />

    <main>
      <section
        aria-labelledby="landing-title"
        className="relative overflow-hidden bg-foreground text-background"
      >
        <GlowBackground />

        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pt-28 pb-14 lg:grid-cols-[1fr_1.05fr] lg:gap-12 lg:px-10 lg:pt-36 lg:pb-20">
          <div>
            <h1
              id="landing-title"
              className="text-4xl font-bold tracking-tight text-balance text-background sm:text-5xl"
            >
              Know where your team&apos;s time goes
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-8 text-brand-mist">
              WorkTrack brings your people, projects and hours together.
              Everyone fills in a simple weekly timesheet, and you see who
              worked on what, what is planned next and how each month adds up.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className={buttonVariants({ size: "xl" })}>
                Start a company
              </Link>

              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "outline", size: "xl" }),
                  ON_DARK_OUTLINE_CLASS,
                )}
              >
                Sign in
              </Link>
            </div>

            <p className="mt-5 flex items-center gap-2 text-sm text-brand-mist">
              <Mail className="size-4 shrink-0" aria-hidden="true" />
              Joining a company? Use the link in your invitation email.
            </p>
          </div>

          <ProductIllustration />
        </div>
      </section>

      <section
        id={BENEFITS_SECTION_ID}
        aria-labelledby="benefits-title"
        className="border-y border-border bg-card"
      >
        <div className="mx-auto max-w-6xl px-6 py-16 lg:px-10 lg:py-20">
          <h2 id="benefits-title" className={SECTION_TITLE_CLASS}>
            What WorkTrack does for your company
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            A clear picture of your people and their work, and hours you can
            rely on when it is time to invoice.
          </p>

          <ul className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map(({ icon: Icon, title, description }) => (
              <li key={title}>
                <Icon
                  className="size-5 text-muted-foreground"
                  aria-hidden="true"
                />

                <h3 className="mt-3 text-base font-semibold text-foreground">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        id={GETTING_STARTED_SECTION_ID}
        aria-labelledby="getting-started-title"
        className="mx-auto max-w-6xl px-6 py-16 lg:px-10 lg:py-20"
      >
        <h2 id="getting-started-title" className={SECTION_TITLE_CLASS}>
          Getting started
        </h2>

        <ol className="mt-10 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {STEPS.map((step, index) => (
            <li key={step.title} className="border-t-2 border-brand/30 pt-5">
              <span className="text-sm font-semibold text-brand">
                Step {index + 1}
              </span>

              <h3 className="mt-2 text-base font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  </div>
);

import { PROJECT_COLORS } from "@/lib/constants/project-colors";

// Invented sample data for the landing-page illustration only.

export const SAMPLE_PROJECTS = {
  website: { name: "Website redesign", color: PROJECT_COLORS[0] },
  mobile: { name: "Mobile app", color: PROJECT_COLORS[1] },
  internal: { name: "Internal", color: PROJECT_COLORS[2] },
} as const;

type SampleProjectKey = keyof typeof SAMPLE_PROJECTS;

export type SampleDay = {
  day: string;
  entries: { project: SampleProjectKey; minutes: number }[];
  absence?: string;
};

export const SAMPLE_WEEK: SampleDay[] = [
  {
    day: "Mon",
    entries: [
      { project: "website", minutes: 300 },
      { project: "internal", minutes: 60 },
      { project: "mobile", minutes: 120 },
    ],
  },
  {
    day: "Tue",
    entries: [
      { project: "mobile", minutes: 360 },
      { project: "internal", minutes: 120 },
    ],
  },
  {
    day: "Wed",
    entries: [
      { project: "website", minutes: 240 },
      { project: "mobile", minutes: 240 },
    ],
  },
  {
    day: "Thu",
    entries: [
      { project: "mobile", minutes: 420 },
      { project: "internal", minutes: 60 },
    ],
  },
  { day: "Fri", entries: [], absence: "Vacation" },
];

export const SAMPLE_TEAM = [
  {
    firstName: "Emma",
    lastName: "Clarke",
    minutes: 1920,
    expectedMinutes: 1920,
  },
  {
    firstName: "Liam",
    lastName: "Turner",
    minutes: 1440,
    expectedMinutes: 1920,
  },
  { firstName: "Olivia", lastName: "Brooks", absence: "Vacation" },
] as const;

export const SAMPLE_REPORT: { project: SampleProjectKey; minutes: number }[] = [
  { project: "website", minutes: 124 * 60 },
  { project: "mobile", minutes: 96 * 60 },
  { project: "internal", minutes: 38 * 60 },
];

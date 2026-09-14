import { UserRole } from 'src/users/enums/UserRole.enum';
import { WeekDay } from 'src/companies/enum/week-day.enum';
import { TeamRole } from 'src/teams/enums/team-role.enum';

/**
 * Everything the seeds create is described here, so the data and the
 * credentials file can never drift apart.
 *
 * One company only. Every other seed hangs off it.
 */

export const SEED_PASSWORD = 'Password123!';

export const COMPANY = {
  companyName: 'WorkTrack Demo',
  slug: 'worktrack-demo',
  timezone: 'UTC',
  currency: 'USD',
  weekStartDay: WeekDay.MONDAY,
  standardWorkHoursPerDay: 8,
};

export const OWNER_EMAIL =
  process.env.TEST_OWNER_EMAIL ?? 'owner@worktrack.test';

const MANAGER_EMAIL = 'manager@worktrack.test';
const DEV_EMAIL = 'developer@worktrack.test';
const DESIGNER_EMAIL = 'designer@worktrack.test';
const UNASSIGNED_EMAIL = 'unassigned@worktrack.test';

export interface SeedUser {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  position: string;
  capacityHoursPerWeek: number;
  /** Shown in the credentials file so it is obvious who to log in as and why. */
  note: string;
}

export const USERS: SeedUser[] = [
  {
    email: OWNER_EMAIL,
    username: 'owner',
    firstName: 'Owner',
    lastName: 'Worktrack',
    role: UserRole.OWNER,
    position: 'Owner',
    capacityHoursPerWeek: 40,
    note: 'Sees the whole company. Use this one for admin screens.',
  },
  {
    email: MANAGER_EMAIL,
    username: 'manager',
    firstName: 'Sarah',
    lastName: 'Manager',
    role: UserRole.MANAGER,
    position: 'Engineering Lead',
    capacityHoursPerWeek: 40,
    note: 'Leads the one team, so sees the developer and the designer — but not the unassigned employee.',
  },
  {
    email: DEV_EMAIL,
    username: 'developer',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.EMPLOYEE,
    position: 'Backend Developer',
    capacityHoursPerWeek: 40,
    note: 'On the team, on two projects, has time logged this week.',
  },
  {
    email: DESIGNER_EMAIL,
    username: 'designer',
    firstName: 'Jane',
    lastName: 'Smith',
    role: UserRole.EMPLOYEE,
    position: 'Product Designer',
    capacityHoursPerWeek: 24,
    note: 'On the team, part-time (24h/week), has time logged this week.',
  },
  {
    email: UNASSIGNED_EMAIL,
    username: 'unassigned',
    firstName: 'Mark',
    lastName: 'Nobody',
    role: UserRole.EMPLOYEE,
    position: 'QA Engineer',
    capacityHoursPerWeek: 40,
    note: 'On no team on purpose: the manager must NOT be able to see this person.',
  },
];

export const TEAM = {
  name: 'Core Development Team',
  members: [
    { email: MANAGER_EMAIL, roleInTeam: TeamRole.MANAGER },
    { email: DEV_EMAIL, roleInTeam: TeamRole.MEMBER },
    { email: DESIGNER_EMAIL, roleInTeam: TeamRole.MEMBER },
  ],
};

export const CATEGORIES = [
  'Development',
  'Meetings',
  'Quality Assurance',
  'Design',
  'Management',
];

export const ACTIVITIES = [
  { name: 'Backend', category: 'Development', billable: true },
  { name: 'Frontend', category: 'Development', billable: true },
  { name: 'Code Review', category: 'Development', billable: true },
  { name: 'Bug Fixing', category: 'Development', billable: true },
  { name: 'Daily Standup', category: 'Meetings', billable: false },
  { name: 'Sprint Planning', category: 'Meetings', billable: false },
  { name: 'Client Meeting', category: 'Meetings', billable: true },
  { name: 'Manual Testing', category: 'Quality Assurance', billable: true },
  { name: 'UI Design', category: 'Design', billable: true },
  { name: 'UX Research', category: 'Design', billable: true },
  { name: 'Documentation', category: 'Management', billable: false },
  {
    name: 'Vacation',
    category: 'Management',
    billable: false,
    isAbsence: true,
  },
];

/**
 * Only employees are listed as project members — the app strips owners and
 * managers when a project is saved from the UI, so seeding them would be undone
 * on the first edit.
 */
export const PROJECTS = [
  {
    name: 'WorkTrack',
    clientName: 'Internal Product',
    description: 'Internal time tracking app',
    members: [DEV_EMAIL, DESIGNER_EMAIL],
    activities: [
      'Backend',
      'Frontend',
      'Code Review',
      'Daily Standup',
      'Sprint Planning',
      'Documentation',
    ],
  },
  {
    name: 'CRM System',
    clientName: 'Fintech Group',
    description: 'Customer relationship management',
    members: [DEV_EMAIL, UNASSIGNED_EMAIL],
    activities: ['Backend', 'Bug Fixing', 'Manual Testing', 'Client Meeting'],
  },
  {
    name: 'Mobile App',
    clientName: 'Retail Corp',
    description: 'E-commerce mobile app',
    members: [DESIGNER_EMAIL],
    activities: ['Frontend', 'UI Design', 'UX Research'],
  },
];

/** Time logged this week, so the timesheet is not empty on first login. */
export const TIME_LOGS = [
  {
    email: DEV_EMAIL,
    project: 'WorkTrack',
    activity: 'Backend',
    day: 0,
    minutes: 360,
  },
  {
    email: DEV_EMAIL,
    project: 'WorkTrack',
    activity: 'Daily Standup',
    day: 0,
    minutes: 30,
  },
  {
    email: DEV_EMAIL,
    project: 'CRM System',
    activity: 'Bug Fixing',
    day: 1,
    minutes: 240,
  },
  {
    email: DEV_EMAIL,
    project: 'WorkTrack',
    activity: 'Code Review',
    day: 1,
    minutes: 120,
  },
  {
    email: DEV_EMAIL,
    project: 'WorkTrack',
    activity: 'Backend',
    day: 2,
    minutes: 420,
  },
  {
    email: DEV_EMAIL,
    project: 'CRM System',
    activity: 'Client Meeting',
    day: 3,
    minutes: 60,
  },
  {
    email: DEV_EMAIL,
    project: 'WorkTrack',
    activity: 'Documentation',
    day: 3,
    minutes: 180,
  },
  {
    email: DESIGNER_EMAIL,
    project: 'Mobile App',
    activity: 'UI Design',
    day: 0,
    minutes: 300,
  },
  {
    email: DESIGNER_EMAIL,
    project: 'Mobile App',
    activity: 'UX Research',
    day: 1,
    minutes: 240,
  },
  {
    email: DESIGNER_EMAIL,
    project: 'WorkTrack',
    activity: 'Frontend',
    day: 2,
    minutes: 300,
  },
  {
    email: UNASSIGNED_EMAIL,
    project: 'CRM System',
    activity: 'Manual Testing',
    day: 0,
    minutes: 480,
  },
  {
    email: UNASSIGNED_EMAIL,
    project: 'CRM System',
    activity: 'Manual Testing',
    day: 1,
    minutes: 420,
  },
];

/** Planned hours for the same week, so planned-vs-actual has both sides. */
export const PLANNING = [
  {
    email: DEV_EMAIL,
    project: 'WorkTrack',
    activity: 'Backend',
    day: 0,
    minutes: 480,
  },
  {
    email: DEV_EMAIL,
    project: 'WorkTrack',
    activity: 'Backend',
    day: 1,
    minutes: 480,
  },
  {
    email: DEV_EMAIL,
    project: 'CRM System',
    activity: 'Bug Fixing',
    day: 2,
    minutes: 480,
  },
  {
    email: DESIGNER_EMAIL,
    project: 'Mobile App',
    activity: 'UI Design',
    day: 0,
    minutes: 300,
  },
  {
    email: DESIGNER_EMAIL,
    project: 'Mobile App',
    activity: 'UX Research',
    day: 1,
    minutes: 300,
  },
  {
    email: UNASSIGNED_EMAIL,
    project: 'CRM System',
    activity: 'Manual Testing',
    day: 0,
    minutes: 480,
  },
];

/** Monday of the current week, as `YYYY-MM-DD`. */
export function weekStart(): Date {
  const date = new Date();
  const offset = (date.getUTCDay() + 6) % 7; // Monday = 0

  date.setUTCDate(date.getUTCDate() - offset);
  date.setUTCHours(0, 0, 0, 0);

  return date;
}

export function dayOfWeek(index: number): string {
  const date = weekStart();
  date.setUTCDate(date.getUTCDate() + index);

  return date.toISOString().slice(0, 10);
}

/**
 * Quarters of the current year. Quarters that have already ended are locked,
 * which is what makes the date-lock rule visible when testing.
 */
export function reportingPeriods() {
  const year = new Date().getUTCFullYear();
  const today = new Date().toISOString().slice(0, 10);

  return [
    { quarter: 1, startDate: `${year}-01-01`, endDate: `${year}-03-31` },
    { quarter: 2, startDate: `${year}-04-01`, endDate: `${year}-06-30` },
    { quarter: 3, startDate: `${year}-07-01`, endDate: `${year}-09-30` },
    { quarter: 4, startDate: `${year}-10-01`, endDate: `${year}-12-31` },
  ].map((period) => ({
    name: `Q${period.quarter} ${year}`,
    startDate: period.startDate,
    endDate: period.endDate,
    isPast: period.endDate < today,
  }));
}

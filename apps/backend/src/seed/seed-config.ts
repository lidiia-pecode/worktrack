import { AbsenceType } from 'src/absences/enums/absence-type.enum';
import { ActivityStatus } from 'src/activities/enums/activity-status.enum';
import { ActCategoryStatus } from 'src/activity-categories/enums/category-status.enum';
import { ProjectStatus } from 'src/projects/enums/project-status.enum';
import { UserRole, UserStatus } from 'src/users/enums/user-role.enum';
import { WeekDay } from 'src/companies/enums/week-day.enum';
import { TeamRole } from 'src/teams/enums/team-role.enum';
import { TeamStatus } from 'src/teams/enums/team-status.enum';

/**
 * Everything the seeds create is described here, so the data and the
 * credentials file can never drift apart.
 *
 * One company only. Every other seed hangs off it. Beyond the accounts used
 * to check the roles, it holds enough demo people, teams, projects and
 * categories to judge the Manage lists: archived and deactivated ones, drafts,
 * an empty category and long names. The seed writes straight to the tables, so
 * this data keeps the app's rules itself.
 */

export const SEED_PASSWORD = 'Password123!';

export const CAPACITY_VALID_FROM = '2020-01-01';

export const ACCOUNTS_CREATED_AT = new Date(`${CAPACITY_VALID_FROM}T00:00:00Z`);

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

// Demo people, so the Manage lists have enough rows to judge.
const SECOND_MANAGER_EMAIL = 'olivia.bennett@worktrack.test';
const DEACTIVATED_MANAGER_EMAIL = 'daniel.hughes@worktrack.test';
const DEACTIVATED_EMAIL = 'chloe.adams@worktrack.test';
const LONG_NAME_EMAIL = 'alexander.montgomery-fitzgerald@worktrack.test';
const LIAM = 'liam.carter@worktrack.test';
const EMMA = 'emma.clarke@worktrack.test';
const NOAH = 'noah.turner@worktrack.test';
const AVA = 'ava.mitchell@worktrack.test';
const ETHAN = 'ethan.brooks@worktrack.test';
const MIA = 'mia.collins@worktrack.test';
const LUCAS = 'lucas.reed@worktrack.test';
const ISABELLA = 'isabella.hayes@worktrack.test';
const JAMES = 'james.foster@worktrack.test';
const CHARLOTTE = 'charlotte.price@worktrack.test';
const BENJAMIN = 'benjamin.ward@worktrack.test';
const AMELIA = 'amelia.gray@worktrack.test';
const HENRY = 'henry.cooper@worktrack.test';
const GRACE = 'grace.morgan@worktrack.test';
const SAMUEL = 'samuel.bell@worktrack.test';

export interface SeedUser {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status?: UserStatus;
  position: string;
  capacityHoursPerWeek: number;
  /** What the account is for; the demo people have none. */
  note?: string;
}

export const USERS: SeedUser[] = [
  {
    email: OWNER_EMAIL,
    firstName: 'Owner',
    lastName: 'WorkTrack',
    role: UserRole.OWNER,
    position: 'Owner',
    capacityHoursPerWeek: 40,
    note: 'Sees the whole company. Use this one for admin screens.',
  },
  {
    email: MANAGER_EMAIL,
    firstName: 'Sarah',
    lastName: 'Manager',
    role: UserRole.MANAGER,
    position: 'Engineering Lead',
    capacityHoursPerWeek: 40,
    note: 'Leads Core Development and Platform, so sees their people — but not the unassigned employee or the other teams.',
  },
  {
    email: DEV_EMAIL,
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.EMPLOYEE,
    position: 'Backend Developer',
    capacityHoursPerWeek: 40,
    note: 'On the team, on two projects, has time logged this week.',
  },
  {
    email: DESIGNER_EMAIL,
    firstName: 'Jane',
    lastName: 'Smith',
    role: UserRole.EMPLOYEE,
    position: 'Product Designer',
    capacityHoursPerWeek: 24,
    note: 'On the team, part-time (24h/week), has time logged this week.',
  },
  {
    email: UNASSIGNED_EMAIL,
    firstName: 'Mark',
    lastName: 'Nobody',
    role: UserRole.EMPLOYEE,
    position: 'QA Engineer',
    capacityHoursPerWeek: 40,
    note: 'On no team on purpose: the managers must NOT be able to see this person.',
  },
  {
    email: SECOND_MANAGER_EMAIL,
    firstName: 'Olivia',
    lastName: 'Bennett',
    role: UserRole.MANAGER,
    position: 'Head of Design and Customer Success',
    capacityHoursPerWeek: 40,
    note: "Leads Design Studio and Customer Success, so sees none of Sarah's people.",
  },
  {
    email: DEACTIVATED_MANAGER_EMAIL,
    firstName: 'Daniel',
    lastName: 'Hughes',
    role: UserRole.MANAGER,
    status: UserStatus.DEACTIVATED,
    position: 'QA Lead',
    capacityHoursPerWeek: 40,
    note: 'Deactivated, so Quality Assurance has no active manager.',
  },
  {
    email: DEACTIVATED_EMAIL,
    firstName: 'Chloe',
    lastName: 'Adams',
    role: UserRole.EMPLOYEE,
    status: UserStatus.DEACTIVATED,
    position: 'Visual Designer',
    capacityHoursPerWeek: 40,
    note: 'Deactivated, kept on two projects and in the archived team.',
  },
  {
    email: LONG_NAME_EMAIL,
    firstName: 'Alexander',
    lastName: 'Montgomery-Fitzgerald',
    role: UserRole.EMPLOYEE,
    position: 'Principal Solutions Architect, Enterprise Integrations',
    capacityHoursPerWeek: 40,
    note: 'A long name, email and position.',
  },
  {
    email: LIAM,
    firstName: 'Liam',
    lastName: 'Carter',
    role: UserRole.EMPLOYEE,
    position: 'Frontend Developer',
    capacityHoursPerWeek: 40,
  },
  {
    email: EMMA,
    firstName: 'Emma',
    lastName: 'Clarke',
    role: UserRole.EMPLOYEE,
    position: 'Backend Developer',
    capacityHoursPerWeek: 40,
  },
  {
    email: NOAH,
    firstName: 'Noah',
    lastName: 'Turner',
    role: UserRole.EMPLOYEE,
    position: 'Full-Stack Developer',
    capacityHoursPerWeek: 32,
  },
  {
    email: AVA,
    firstName: 'Ava',
    lastName: 'Mitchell',
    role: UserRole.EMPLOYEE,
    position: 'Mobile Developer',
    capacityHoursPerWeek: 40,
  },
  {
    email: ETHAN,
    firstName: 'Ethan',
    lastName: 'Brooks',
    role: UserRole.EMPLOYEE,
    position: 'DevOps Engineer',
    capacityHoursPerWeek: 40,
  },
  {
    email: MIA,
    firstName: 'Mia',
    lastName: 'Collins',
    role: UserRole.EMPLOYEE,
    position: 'Site Reliability Engineer',
    capacityHoursPerWeek: 40,
  },
  {
    email: LUCAS,
    firstName: 'Lucas',
    lastName: 'Reed',
    role: UserRole.EMPLOYEE,
    position: 'Data Engineer',
    capacityHoursPerWeek: 40,
  },
  {
    email: ISABELLA,
    firstName: 'Isabella',
    lastName: 'Hayes',
    role: UserRole.EMPLOYEE,
    position: 'UX Designer',
    capacityHoursPerWeek: 24,
  },
  {
    email: JAMES,
    firstName: 'James',
    lastName: 'Foster',
    role: UserRole.EMPLOYEE,
    position: 'Visual Designer',
    capacityHoursPerWeek: 40,
  },
  {
    email: CHARLOTTE,
    firstName: 'Charlotte',
    lastName: 'Price',
    role: UserRole.EMPLOYEE,
    position: 'Content Designer',
    capacityHoursPerWeek: 32,
  },
  {
    email: BENJAMIN,
    firstName: 'Benjamin',
    lastName: 'Ward',
    role: UserRole.EMPLOYEE,
    position: 'Implementation Consultant',
    capacityHoursPerWeek: 40,
  },
  {
    email: AMELIA,
    firstName: 'Amelia',
    lastName: 'Gray',
    role: UserRole.EMPLOYEE,
    position: 'Customer Success Specialist',
    capacityHoursPerWeek: 40,
  },
  {
    email: HENRY,
    firstName: 'Henry',
    lastName: 'Cooper',
    role: UserRole.EMPLOYEE,
    position: 'Support Engineer',
    capacityHoursPerWeek: 20,
  },
  {
    email: GRACE,
    firstName: 'Grace',
    lastName: 'Morgan',
    role: UserRole.EMPLOYEE,
    position: 'QA Engineer',
    capacityHoursPerWeek: 40,
  },
  {
    email: SAMUEL,
    firstName: 'Samuel',
    lastName: 'Bell',
    role: UserRole.EMPLOYEE,
    position: 'Test Automation Engineer',
    capacityHoursPerWeek: 40,
  },
];

export interface SeedTeam {
  name: string;
  /** An archived team's memberships are closed, as archiving does. */
  status?: TeamStatus;
  members: { email: string; roleInTeam: TeamRole }[];
}

export const TEAMS: SeedTeam[] = [
  {
    name: 'Core Development Team',
    members: [
      { email: MANAGER_EMAIL, roleInTeam: TeamRole.MANAGER },
      { email: DEV_EMAIL, roleInTeam: TeamRole.MEMBER },
      { email: DESIGNER_EMAIL, roleInTeam: TeamRole.MEMBER },
      { email: LIAM, roleInTeam: TeamRole.MEMBER },
      { email: EMMA, roleInTeam: TeamRole.MEMBER },
      { email: NOAH, roleInTeam: TeamRole.MEMBER },
      { email: AVA, roleInTeam: TeamRole.MEMBER },
    ],
  },
  {
    name: 'Platform and Infrastructure',
    members: [
      { email: MANAGER_EMAIL, roleInTeam: TeamRole.MANAGER },
      { email: ETHAN, roleInTeam: TeamRole.MEMBER },
      { email: MIA, roleInTeam: TeamRole.MEMBER },
      { email: LUCAS, roleInTeam: TeamRole.MEMBER },
      { email: EMMA, roleInTeam: TeamRole.MEMBER },
    ],
  },
  {
    name: 'Design Studio',
    members: [
      { email: SECOND_MANAGER_EMAIL, roleInTeam: TeamRole.MANAGER },
      { email: ISABELLA, roleInTeam: TeamRole.MEMBER },
      { email: JAMES, roleInTeam: TeamRole.MEMBER },
      { email: CHARLOTTE, roleInTeam: TeamRole.MEMBER },
    ],
  },
  {
    name: 'Customer Success and Implementation Services, EMEA Region',
    members: [
      { email: SECOND_MANAGER_EMAIL, roleInTeam: TeamRole.MANAGER },
      { email: BENJAMIN, roleInTeam: TeamRole.MEMBER },
      { email: AMELIA, roleInTeam: TeamRole.MEMBER },
      { email: HENRY, roleInTeam: TeamRole.MEMBER },
      { email: LONG_NAME_EMAIL, roleInTeam: TeamRole.MEMBER },
    ],
  },
  {
    // Its only manager is deactivated.
    name: 'Quality Assurance',
    members: [
      { email: DEACTIVATED_MANAGER_EMAIL, roleInTeam: TeamRole.MANAGER },
      { email: GRACE, roleInTeam: TeamRole.MEMBER },
      { email: SAMUEL, roleInTeam: TeamRole.MEMBER },
    ],
  },
  {
    name: 'Legacy Support',
    status: TeamStatus.ARCHIVED,
    members: [
      { email: DEACTIVATED_EMAIL, roleInTeam: TeamRole.MEMBER },
      { email: HENRY, roleInTeam: TeamRole.MEMBER },
    ],
  },
];

export interface SeedCategory {
  name: string;
  /** An archived category holds only archived activities. */
  status?: ActCategoryStatus;
}

export const CATEGORIES: SeedCategory[] = [
  { name: 'Development' },
  { name: 'Meetings' },
  { name: 'Quality Assurance' },
  { name: 'Design' },
  { name: 'Management' },
  { name: 'Infrastructure and Operations' },
  { name: 'Customer Support and Service Desk Operations' },
  { name: 'Sales' },
  { name: 'Legacy Training', status: ActCategoryStatus.ARCHIVED },
];

export interface SeedActivity {
  name: string;
  /** None makes it a draft, which no project may offer. */
  category: string | null;
  billable: boolean;
  status?: ActivityStatus;
}

export const ACTIVITIES: SeedActivity[] = [
  { name: 'Backend', category: 'Development', billable: true },
  { name: 'Frontend', category: 'Development', billable: true },
  { name: 'Code Review', category: 'Development', billable: true },
  { name: 'Bug Fixing', category: 'Development', billable: true },
  {
    name: 'Legacy Data Migration',
    category: 'Development',
    billable: true,
    status: ActivityStatus.ARCHIVED,
  },
  { name: 'Daily Standup', category: 'Meetings', billable: false },
  { name: 'Sprint Planning', category: 'Meetings', billable: false },
  { name: 'Client Meeting', category: 'Meetings', billable: true },
  { name: 'Manual Testing', category: 'Quality Assurance', billable: true },
  { name: 'Test Automation', category: 'Quality Assurance', billable: true },
  {
    name: 'Performance Optimisation and Load Testing Across Environments',
    category: 'Quality Assurance',
    billable: true,
  },
  { name: 'UI Design', category: 'Design', billable: true },
  { name: 'UX Research', category: 'Design', billable: true },
  { name: 'Prototyping', category: 'Design', billable: true },
  { name: 'Documentation', category: 'Management', billable: false },
  {
    name: 'Deployment',
    category: 'Infrastructure and Operations',
    billable: true,
  },
  {
    name: 'Monitoring and Alerting',
    category: 'Infrastructure and Operations',
    billable: false,
  },
  {
    name: 'Incident Response',
    category: 'Infrastructure and Operations',
    billable: false,
  },
  {
    name: 'Customer Onboarding',
    category: 'Customer Support and Service Desk Operations',
    billable: true,
  },
  {
    name: 'Support Tickets',
    category: 'Customer Support and Service Desk Operations',
    billable: false,
  },
  {
    name: 'Internal Workshops',
    category: 'Legacy Training',
    billable: false,
    status: ActivityStatus.ARCHIVED,
  },
  {
    name: 'Onboarding Sessions',
    category: 'Legacy Training',
    billable: false,
    status: ActivityStatus.ARCHIVED,
  },
  { name: 'Hackathon', category: null, billable: false },
  { name: 'Conference Talk Preparation', category: null, billable: false },
];

export interface SeedProject {
  name: string;
  clientName: string | null;
  description: string;
  status?: ProjectStatus;
  members: string[];
  /** Only active activities with a category, as the app allows. */
  activities: string[];
}

/**
 * Only employees are listed as project members — the app strips owners and
 * managers when a project is saved from the UI, so seeding them would be undone
 * on the first edit. A deactivated member stays, as the app keeps them.
 */
export const PROJECTS: SeedProject[] = [
  {
    name: 'WorkTrack',
    clientName: null,
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
  {
    name: 'Customer Portal Redesign',
    clientName: 'Northwind Traders',
    description: [
      '## Goals',
      '',
      'Move the **customer portal** to the new design system, without a big-bang release.',
      '',
      '- Self-service invoices',
      '- Order tracking',
      '- Accessible forms (WCAG AA)',
      '',
      '> Launch planned for the first quarter.',
    ].join('\n'),
    members: [LIAM, AVA, ISABELLA, JAMES],
    activities: [
      'Frontend',
      'UI Design',
      'UX Research',
      'Prototyping',
      'Client Meeting',
    ],
  },
  {
    name: 'Data Warehouse Migration',
    clientName: 'Fintech Group',
    description:
      'Move reporting from the old warehouse to the new one, *one source at a time*.',
    members: [EMMA, LUCAS],
    activities: ['Backend', 'Code Review', 'Bug Fixing', 'Deployment'],
  },
  {
    name: 'Cloud Infrastructure',
    clientName: null,
    description: [
      'Shared environments for every team.',
      '',
      '1. Staging per pull request',
      '2. Alerts routed to the on-call engineer',
      '3. Nightly backups, checked with `pg_restore`',
    ].join('\n'),
    members: [ETHAN, MIA, LUCAS],
    activities: [
      'Deployment',
      'Monitoring and Alerting',
      'Incident Response',
      'Documentation',
    ],
  },
  {
    name: 'Enterprise Resource Planning Integration for Global Logistics Operations',
    clientName: 'International Freight & Logistics Consolidated Holdings Ltd.',
    description: [
      '# Scope',
      '',
      'Connect the client’s **ERP** to their warehouses, carriers and customs brokers across fourteen countries, replacing nightly spreadsheet exports with live order and shipment updates.',
      '',
      '## Phases',
      '',
      '1. Discovery with each regional office',
      '2. Order and inventory sync',
      '3. Carrier tracking and customs documents',
      '4. Load testing before the peak season',
      '',
      'Every change goes through the client’s change board, so plan *two weeks* of lead time for anything that touches production.',
    ].join('\n'),
    members: [LONG_NAME_EMAIL, BENJAMIN, NOAH, GRACE, SAMUEL],
    activities: [
      'Backend',
      'Customer Onboarding',
      'Client Meeting',
      'Manual Testing',
      'Performance Optimisation and Load Testing Across Environments',
      'Documentation',
    ],
  },
  {
    name: 'Support Desk',
    clientName: null,
    description: 'First-line support for every client.',
    members: [AMELIA, HENRY, BENJAMIN, DEACTIVATED_EMAIL],
    activities: ['Support Tickets', 'Customer Onboarding'],
  },
  {
    name: 'Brand Refresh',
    clientName: 'Retail Corp',
    description: 'New logo, colours and tone of voice.',
    members: [CHARLOTTE, JAMES],
    activities: ['UI Design', 'Prototyping', 'Documentation'],
  },
  {
    name: 'QA Automation Suite',
    clientName: null,
    description: 'End-to-end tests for the main flows.',
    members: [GRACE, SAMUEL],
    activities: [
      'Test Automation',
      'Manual Testing',
      'Performance Optimisation and Load Testing Across Environments',
    ],
  },
  {
    name: 'Partner API Pilot',
    clientName: 'Northwind Traders',
    description: 'Not staffed yet.',
    members: [],
    activities: [],
  },
  {
    name: 'Website Relaunch 2025',
    clientName: 'Retail Corp',
    description: 'Finished and archived.',
    status: ProjectStatus.ARCHIVED,
    members: [DESIGNER_EMAIL, DEACTIVATED_EMAIL],
    activities: ['Frontend', 'UI Design'],
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
    day: 0,
    minutes: 480,
  },
  {
    email: DEV_EMAIL,
    project: 'WorkTrack',
    day: 1,
    minutes: 480,
  },
  {
    email: DEV_EMAIL,
    project: 'CRM System',
    day: 2,
    minutes: 480,
  },
  {
    email: DESIGNER_EMAIL,
    project: 'Mobile App',
    day: 0,
    minutes: 300,
  },
  {
    email: DESIGNER_EMAIL,
    project: 'Mobile App',
    day: 1,
    minutes: 300,
  },
  {
    email: UNASSIGNED_EMAIL,
    project: 'CRM System',
    day: 0,
    minutes: 480,
  },
];

/**
 * Two absences each, on days the time logs above leave free — Friday of this
 * week, and a whole week off after it. Seeding a public holiday per person is
 * not a duplicate: a holiday belongs to whoever takes it, and somebody may
 * work it instead.
 */
export const ABSENCES = [
  ...[MANAGER_EMAIL, DEV_EMAIL, DESIGNER_EMAIL, UNASSIGNED_EMAIL].flatMap(
    (email) => [
      { email, type: AbsenceType.PUBLIC_HOLIDAY, startDay: 4, endDay: 4 },
      { email, type: AbsenceType.VACATION, startDay: 7, endDay: 11 },
    ],
  ),
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

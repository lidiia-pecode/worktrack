import { AbsenceType } from 'src/absences/enums/absence-type.enum';
import { ActivityStatus } from 'src/activities/enums/activity-status.enum';
import { ActCategoryStatus } from 'src/activity-categories/enums/category-status.enum';
import { ProjectStatus } from 'src/projects/enums/project-status.enum';
import { UserRole, UserStatus } from 'src/users/enums/user-role.enum';
import { WeekDay } from 'src/companies/enums/week-day.enum';
import { TeamRole } from 'src/teams/enums/team-role.enum';
import { TeamStatus } from 'src/teams/enums/team-status.enum';
import {
  addDays,
  isWorkingDay,
  todayISODate,
  weekRange,
} from 'src/capacity/working-days.util';
import { lastDayOfMonth } from 'src/reporting/reporting-months.util';

/**
 * Everything the seeds create is described here, so the data and the
 * credentials file can never drift apart.
 *
 * One company of 25 people in five teams, with history from 1 June 2026 and
 * plans to the end of next month, all counted from the day the seed is built
 * for. It tells the story the app is shown with: closed months and an open
 * one, days with no time, a gap in the plans and someone away, projects off
 * plan, a part-timer, a leaver, a team move and a plan left above someone's
 * lowered hours. The cases only tests need (marked `testOnly`) come on top,
 * unless SEED_TEST_CASES=false. The seed writes straight to the tables, so
 * this data keeps the app's rules itself.
 */

const readEnv = (key: string) => process.env[key]?.trim() || undefined;

// ---------------------------------------------------------------------------
// Options: the local defaults, or the demo company's values.
// ---------------------------------------------------------------------------

/** The day the data is built for; the story is counted from it. */
export const SEED_TODAY = readEnv('SEED_TODAY') ?? todayISODate('UTC');

// A real calendar day: "2026-11-31" would otherwise roll over to 1 December.
const isCalendarDate = (date: string) => {
  const time = Date.parse(`${date}T00:00:00Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(time) &&
    new Date(time).toISOString().slice(0, 10) === date
  );
};

if (!isCalendarDate(SEED_TODAY)) {
  throw new Error(
    `SEED_TODAY must be a real day as YYYY-MM-DD, not "${SEED_TODAY}".`,
  );
}

/** The cases only tests need: someone on no team, long names, an archived team. */
export const INCLUDE_TEST_CASES = readEnv('SEED_TEST_CASES') !== 'false';

export const SEED_PASSWORD = readEnv('SEED_PASSWORD') ?? 'Password123!';

const EMAIL_DOMAIN = readEnv('SEED_EMAIL_DOMAIN') ?? 'worktrack.test';

const at = (localPart: string) => `${localPart}@${EMAIL_DOMAIN}`;

// The local owner may sign in with the developer's own address
// (TEST_OWNER_EMAIL); a company on another email domain never gets it.
const LOCAL_OWNER_EMAIL = readEnv('SEED_EMAIL_DOMAIN')
  ? undefined
  : readEnv('TEST_OWNER_EMAIL');

export const OWNER_EMAIL =
  readEnv('SEED_OWNER_EMAIL') ?? LOCAL_OWNER_EMAIL ?? at('owner');

// ---------------------------------------------------------------------------
// Days, counted from SEED_TODAY.
// ---------------------------------------------------------------------------

/**
 * The company's first day, the first one Reports and Periods offer. Everyone
 * joined that day unless their entry says otherwise, so their expected hours
 * and the history start there too.
 */
export const CAPACITY_VALID_FROM = '2026-06-01';

export const HISTORY_START = CAPACITY_VALID_FROM;

export const COMPANY_CREATED_AT = new Date(`${CAPACITY_VALID_FROM}T00:00:00Z`);

export const ACCOUNTS_CREATED_AT = COMPANY_CREATED_AT;

const MONDAY_THIS_WEEK = weekRange(SEED_TODAY, WeekDay.MONDAY).start;

/** A day of a week around SEED_TODAY's: `weeks` from it, `day` 0 for Monday. */
const weekDay = (weeks: number, day: number) =>
  addDays(MONDAY_THIS_WEEK, weeks * 7 + day);

const MONDAY = 0;
const TUESDAY = 1;
const WEDNESDAY = 2;
const THURSDAY = 3;
const FRIDAY = 4;
const SATURDAY = 5;

export const YESTERDAY = addDays(SEED_TODAY, -1);

const lastWorkingDayBefore = (date: string) => {
  let day = addDays(date, -1);
  while (!isWorkingDay(day)) day = addDays(day, -1);
  return day;
};

/** Plans run to the end of next month, as far ahead as Planning's month looks. */
export const PLANS_UNTIL = lastDayOfMonth(
  addDays(lastDayOfMonth(SEED_TODAY), 1),
);

/** Everybody's day off, except whoever works it. */
export const PUBLIC_HOLIDAYS = ['2026-08-31'];

// The story's days.
const ETHAN_HOURS_DROP_ON = weekDay(-6, MONDAY);
const LEO_MOVED_ON = weekDay(-5, WEDNESDAY);
const ISLA_LAST_WORKING_DAY = weekDay(-4, FRIDAY);
const RUBY_JOINED_ON = weekDay(-10, MONDAY);
const RUBY_PLANNED_UNTIL = weekDay(0, FRIDAY + 2);
const LIAM_MISSES_FRIDAYS_FROM = weekDay(-2, MONDAY);
const TEST_LEAVERS_LAST_DAY = '2026-06-30';

// ---------------------------------------------------------------------------
// The company.
// ---------------------------------------------------------------------------

export const COMPANY = {
  id: readEnv('SEED_COMPANY_ID'),
  companyName: readEnv('SEED_COMPANY_NAME') ?? 'WorkTrack Demo',
  slug: readEnv('SEED_COMPANY_SLUG') ?? 'worktrack-demo',
  timezone: 'UTC',
  currency: 'USD',
  weekStartDay: WeekDay.MONDAY,
  standardWorkHoursPerDay: 8,
  createdAt: COMPANY_CREATED_AT,
  // The owner set the company up, so the setup guide doesn't open.
  setupFinishedAt: COMPANY_CREATED_AT,
};

/** Drops what only tests need when they are left out. */
const included = <T extends { testOnly?: boolean }>(items: T[]) =>
  INCLUDE_TEST_CASES ? items : items.filter((item) => !item.testOnly);

// ---------------------------------------------------------------------------
// People.
// ---------------------------------------------------------------------------

const MANAGER = at('manager');
const JOHN = at('developer');
const JANE = at('designer');
const LIAM = at('liam.carter');
const EMMA = at('emma.clarke');
const AVA = at('ava.mitchell');
const OLIVIA = at('olivia.bennett');
const ISABELLA = at('isabella.hayes');
const JAMES = at('james.foster');
const CHARLOTTE = at('charlotte.price');
const MICHAEL = at('michael.hart');
const SOPHIA = at('sophia.reynolds');
const HARPER = at('harper.lewis');
const ELLA = at('ella.bailey');
const LEO = at('leo.harrison');
const ISLA = at('isla.robinson');
const RACHEL = at('rachel.dawson');
const ZOE = at('zoe.palmer');
const MAX = at('max.fletcher');
const RUBY = at('ruby.saunders');
const ETHAN = at('ethan.brooks');
const MIA = at('mia.collins');
const LUCAS = at('lucas.reed');
const GRACE = at('grace.morgan');

// Only tests need these.
const UNASSIGNED = at('unassigned');
const LONG_NAME = at('alexander.montgomery-fitzgerald');
const DEACTIVATED_MANAGER = at('daniel.hughes');
const DEACTIVATED = at('chloe.adams');

export interface SeedUser {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status?: UserStatus;
  position: string;
  capacityHoursPerWeek: number;
  /** What the account is for, in the credentials file. */
  note?: string;
  /** The day they joined, when it isn't the accounts' default; expected hours start here. */
  joinedOn?: string;
  /** A later contract: the weekly hours from a date on. */
  capacityFrom?: { validFrom: string; hoursPerWeek: number };
  /** A deactivated account's last working day; nothing is expected or recorded after it. */
  lastWorkingDay?: string;
  testOnly?: boolean;
}

const ALL_USERS: SeedUser[] = [
  {
    email: OWNER_EMAIL,
    firstName: 'Rebecca',
    lastName: 'Lane',
    role: UserRole.OWNER,
    position: 'Managing Director',
    // The owner doesn't log their own time: no fixed hours.
    capacityHoursPerWeek: 0,
    note: 'Sees the whole company, with no fixed hours of her own.',
  },
  {
    email: MANAGER,
    firstName: 'Sarah',
    lastName: 'Whitman',
    role: UserRole.MANAGER,
    position: 'Engineering Lead',
    capacityHoursPerWeek: 40,
    note: 'Leads Core Development, so sees its people but not the other teams.',
  },
  {
    email: JOHN,
    firstName: 'John',
    lastName: 'Davies',
    role: UserRole.EMPLOYEE,
    position: 'Backend Developer',
    capacityHoursPerWeek: 40,
    note: 'In Core Development, on CRM System.',
  },
  {
    email: JANE,
    firstName: 'Jane',
    lastName: 'Porter',
    role: UserRole.EMPLOYEE,
    position: 'Product Designer',
    capacityHoursPerWeek: 25,
    note: 'Part-time, 5h a day.',
  },
  {
    email: LIAM,
    firstName: 'Liam',
    lastName: 'Carter',
    role: UserRole.EMPLOYEE,
    position: 'Frontend Developer',
    capacityHoursPerWeek: 40,
    note: 'Has logged nothing on Fridays for the last two weeks.',
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
    email: AVA,
    firstName: 'Ava',
    lastName: 'Mitchell',
    role: UserRole.EMPLOYEE,
    position: 'Frontend Developer',
    capacityHoursPerWeek: 40,
  },
  {
    email: OLIVIA,
    firstName: 'Olivia',
    lastName: 'Bennett',
    role: UserRole.MANAGER,
    position: 'Head of Design',
    capacityHoursPerWeek: 40,
    note: 'Leads Design Studio.',
  },
  {
    email: ISABELLA,
    firstName: 'Isabella',
    lastName: 'Hayes',
    role: UserRole.EMPLOYEE,
    position: 'UX Designer',
    capacityHoursPerWeek: 40,
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
    position: 'Brand Designer',
    capacityHoursPerWeek: 40,
    note: 'On holiday next week.',
  },
  {
    email: MICHAEL,
    firstName: 'Michael',
    lastName: 'Hart',
    role: UserRole.MANAGER,
    position: 'Data Lead',
    capacityHoursPerWeek: 40,
    note: 'Leads Data and Analytics, which Leo joined from Mobile Squad.',
  },
  {
    email: SOPHIA,
    firstName: 'Sophia',
    lastName: 'Reynolds',
    role: UserRole.EMPLOYEE,
    position: 'Data Engineer',
    capacityHoursPerWeek: 40,
  },
  {
    email: HARPER,
    firstName: 'Harper',
    lastName: 'Lewis',
    role: UserRole.EMPLOYEE,
    position: 'Data Analyst',
    capacityHoursPerWeek: 40,
  },
  {
    email: ELLA,
    firstName: 'Ella',
    lastName: 'Bailey',
    role: UserRole.EMPLOYEE,
    position: 'Data Scientist',
    capacityHoursPerWeek: 40,
  },
  {
    email: LEO,
    firstName: 'Leo',
    lastName: 'Harrison',
    role: UserRole.EMPLOYEE,
    position: 'Software Engineer',
    capacityHoursPerWeek: 40,
    note: `Moved from Mobile Squad to Data and Analytics on ${LEO_MOVED_ON}.`,
  },
  {
    email: ISLA,
    firstName: 'Isla',
    lastName: 'Robinson',
    role: UserRole.EMPLOYEE,
    status: UserStatus.DEACTIVATED,
    position: 'Security Analyst',
    capacityHoursPerWeek: 40,
    lastWorkingDay: ISLA_LAST_WORKING_DAY,
    note: `Left; her last working day was ${ISLA_LAST_WORKING_DAY}.`,
  },
  {
    email: RACHEL,
    firstName: 'Rachel',
    lastName: 'Dawson',
    role: UserRole.MANAGER,
    position: 'Mobile Lead',
    capacityHoursPerWeek: 40,
    note: 'Leads Mobile Squad.',
  },
  {
    email: ZOE,
    firstName: 'Zoe',
    lastName: 'Palmer',
    role: UserRole.EMPLOYEE,
    position: 'Mobile Developer',
    capacityHoursPerWeek: 40,
    note: 'Logged nothing on two days last week.',
  },
  {
    email: MAX,
    firstName: 'Max',
    lastName: 'Fletcher',
    role: UserRole.EMPLOYEE,
    position: 'QA Engineer',
    capacityHoursPerWeek: 40,
  },
  {
    email: RUBY,
    firstName: 'Ruby',
    lastName: 'Saunders',
    role: UserRole.EMPLOYEE,
    position: 'Product Designer',
    capacityHoursPerWeek: 40,
    joinedOn: RUBY_JOINED_ON,
    note: `Joined on ${RUBY_JOINED_ON}; planned only up to this week.`,
  },
  {
    email: ETHAN,
    firstName: 'Ethan',
    lastName: 'Brooks',
    role: UserRole.MANAGER,
    position: 'Platform Lead',
    capacityHoursPerWeek: 40,
    capacityFrom: { validFrom: ETHAN_HOURS_DROP_ON, hoursPerWeek: 32.5 },
    note: `Leads Platform and Infrastructure. Down to 32h 30m a week from ${ETHAN_HOURS_DROP_ON}, with his 40h plan left as it was.`,
  },
  {
    email: MIA,
    firstName: 'Mia',
    lastName: 'Collins',
    role: UserRole.EMPLOYEE,
    position: 'DevOps Engineer',
    capacityHoursPerWeek: 40,
  },
  {
    email: LUCAS,
    firstName: 'Lucas',
    lastName: 'Reed',
    role: UserRole.EMPLOYEE,
    position: 'Site Reliability Engineer',
    capacityHoursPerWeek: 40,
    note: 'Logged nothing on the last working day.',
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
    email: UNASSIGNED,
    firstName: 'Mark',
    lastName: 'Ellis',
    role: UserRole.EMPLOYEE,
    position: 'QA Tester',
    capacityHoursPerWeek: 40,
    note: 'On no team on purpose: the managers must NOT be able to see him.',
    testOnly: true,
  },
  {
    email: LONG_NAME,
    firstName: 'Alexander',
    lastName: 'Montgomery-Fitzgerald',
    role: UserRole.EMPLOYEE,
    position: 'Senior Integration Architect, Enterprise Logistics',
    capacityHoursPerWeek: 40,
    note: 'A long name, email and position.',
    testOnly: true,
  },
  {
    email: DEACTIVATED_MANAGER,
    firstName: 'Daniel',
    lastName: 'Hughes',
    role: UserRole.MANAGER,
    status: UserStatus.DEACTIVATED,
    position: 'Support Lead',
    capacityHoursPerWeek: 40,
    lastWorkingDay: TEST_LEAVERS_LAST_DAY,
    note: 'Deactivated; led Legacy Support before it was archived.',
    testOnly: true,
  },
  {
    email: DEACTIVATED,
    firstName: 'Chloe',
    lastName: 'Adams',
    role: UserRole.EMPLOYEE,
    status: UserStatus.DEACTIVATED,
    position: 'Support Engineer',
    capacityHoursPerWeek: 40,
    lastWorkingDay: TEST_LEAVERS_LAST_DAY,
    note: 'Deactivated, kept on an archived project and in the archived team.',
    testOnly: true,
  },
];

export const USERS = included(ALL_USERS);

const SEEDED_EMAILS = new Set(USERS.map((user) => user.email));

/** Leaves out the test-only people when they aren't seeded. */
const seededOnly = (emails: string[]) =>
  emails.filter((email) => SEEDED_EMAILS.has(email));

// ---------------------------------------------------------------------------
// Teams.
// ---------------------------------------------------------------------------

export interface SeedTeam {
  name: string;
  status?: TeamStatus;
  members: {
    email: string;
    roleInTeam: TeamRole;
    /** When it isn't the day their account starts. */
    joinedOn?: string;
    leftOn?: string;
  }[];
  testOnly?: boolean;
}

const ALL_TEAMS: SeedTeam[] = [
  {
    name: 'Core Development',
    members: [
      { email: MANAGER, roleInTeam: TeamRole.MANAGER },
      { email: JOHN, roleInTeam: TeamRole.MEMBER },
      { email: JANE, roleInTeam: TeamRole.MEMBER },
      { email: LIAM, roleInTeam: TeamRole.MEMBER },
      { email: EMMA, roleInTeam: TeamRole.MEMBER },
      { email: AVA, roleInTeam: TeamRole.MEMBER },
      { email: LONG_NAME, roleInTeam: TeamRole.MEMBER },
    ],
  },
  {
    name: 'Design Studio',
    members: [
      { email: OLIVIA, roleInTeam: TeamRole.MANAGER },
      { email: ISABELLA, roleInTeam: TeamRole.MEMBER },
      { email: JAMES, roleInTeam: TeamRole.MEMBER },
      { email: CHARLOTTE, roleInTeam: TeamRole.MEMBER },
    ],
  },
  {
    name: 'Data and Analytics',
    members: [
      { email: MICHAEL, roleInTeam: TeamRole.MANAGER },
      { email: SOPHIA, roleInTeam: TeamRole.MEMBER },
      { email: HARPER, roleInTeam: TeamRole.MEMBER },
      { email: ELLA, roleInTeam: TeamRole.MEMBER },
      { email: LEO, roleInTeam: TeamRole.MEMBER, joinedOn: LEO_MOVED_ON },
      { email: ISLA, roleInTeam: TeamRole.MEMBER },
    ],
  },
  {
    name: 'Mobile Squad',
    members: [
      { email: RACHEL, roleInTeam: TeamRole.MANAGER },
      { email: LEO, roleInTeam: TeamRole.MEMBER, leftOn: LEO_MOVED_ON },
      { email: ZOE, roleInTeam: TeamRole.MEMBER },
      { email: MAX, roleInTeam: TeamRole.MEMBER },
      { email: RUBY, roleInTeam: TeamRole.MEMBER },
    ],
  },
  {
    name: 'Platform and Infrastructure',
    members: [
      { email: ETHAN, roleInTeam: TeamRole.MANAGER },
      { email: MIA, roleInTeam: TeamRole.MEMBER },
      { email: LUCAS, roleInTeam: TeamRole.MEMBER },
      { email: GRACE, roleInTeam: TeamRole.MEMBER },
    ],
  },
  {
    // Archiving a team closes its memberships: everyone left before it.
    name: 'Legacy Support',
    status: TeamStatus.ARCHIVED,
    members: [
      {
        email: DEACTIVATED_MANAGER,
        roleInTeam: TeamRole.MANAGER,
        leftOn: TEST_LEAVERS_LAST_DAY,
      },
      {
        email: DEACTIVATED,
        roleInTeam: TeamRole.MEMBER,
        leftOn: TEST_LEAVERS_LAST_DAY,
      },
    ],
    testOnly: true,
  },
];

export const TEAMS = included(ALL_TEAMS).map((team) => ({
  ...team,
  members: team.members.filter((member) => SEEDED_EMAILS.has(member.email)),
}));

// ---------------------------------------------------------------------------
// Categories and activities.
// ---------------------------------------------------------------------------

export interface SeedCategory {
  name: string;
  /** An archived category holds only archived activities. */
  status?: ActCategoryStatus;
  testOnly?: boolean;
}

const ALL_CATEGORIES: SeedCategory[] = [
  { name: 'Development' },
  { name: 'Meetings' },
  { name: 'Quality Assurance' },
  { name: 'Design' },
  { name: 'Management' },
  { name: 'Infrastructure and Operations' },
  { name: 'Research and Discovery' },
  { name: 'Data and Analytics' },
  { name: 'Security and Compliance' },
  { name: 'Training and Learning' },
  { name: 'Customer Support and Service Desk Operations', testOnly: true },
  {
    name: 'Legacy Training',
    status: ActCategoryStatus.ARCHIVED,
    testOnly: true,
  },
];

export const CATEGORIES = included(ALL_CATEGORIES);

export interface SeedActivity {
  name: string;
  category: string;
  billable: boolean;
  status?: ActivityStatus;
  testOnly?: boolean;
}

const ALL_ACTIVITIES: SeedActivity[] = [
  { name: 'Backend', category: 'Development', billable: true },
  { name: 'Frontend', category: 'Development', billable: true },
  { name: 'Code Review', category: 'Development', billable: true },
  { name: 'Bug Fixing', category: 'Development', billable: true },
  { name: 'Daily Standup', category: 'Meetings', billable: false },
  { name: 'Sprint Planning', category: 'Meetings', billable: false },
  { name: 'Client Meeting', category: 'Meetings', billable: true },
  { name: 'Manual Testing', category: 'Quality Assurance', billable: true },
  { name: 'Test Automation', category: 'Quality Assurance', billable: true },
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
    name: 'Discovery Workshop',
    category: 'Research and Discovery',
    billable: true,
  },
  { name: 'Data Modelling', category: 'Data and Analytics', billable: true },
  {
    name: 'Dashboard Building',
    category: 'Data and Analytics',
    billable: true,
  },
  {
    name: 'Security Review',
    category: 'Security and Compliance',
    billable: true,
  },
  {
    name: 'Compliance Audit',
    category: 'Security and Compliance',
    billable: false,
  },
  { name: 'Training', category: 'Training and Learning', billable: false },
  {
    name: 'Legacy Data Migration',
    category: 'Development',
    billable: true,
    status: ActivityStatus.ARCHIVED,
    testOnly: true,
  },
  {
    name: 'Performance Optimisation and Load Testing Across Environments',
    category: 'Quality Assurance',
    billable: true,
    testOnly: true,
  },
  {
    name: 'Customer Onboarding',
    category: 'Customer Support and Service Desk Operations',
    billable: true,
    testOnly: true,
  },
  {
    name: 'Internal Workshops',
    category: 'Legacy Training',
    billable: false,
    status: ActivityStatus.ARCHIVED,
    testOnly: true,
  },
];

export const ACTIVITIES = included(ALL_ACTIVITIES);

// ---------------------------------------------------------------------------
// Projects.
// ---------------------------------------------------------------------------

export interface SeedProject {
  name: string;
  clientName: string | null;
  description: string;
  status?: ProjectStatus;
  members: string[];
  /** Only active activities with a category, as the app allows. */
  activities: string[];
  testOnly?: boolean;
}

const LONG_PROJECT =
  'Enterprise Resource Planning Integration for Global Logistics Operations';

/**
 * Mostly employees; the managers are on Team Management, where they log their
 * own time, as a manager can add themselves to a project. A member who left
 * stays, as the app keeps them.
 */
const ALL_PROJECTS: SeedProject[] = [
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
    ].join('\n'),
    members: [LIAM, AVA, JANE, OLIVIA, ISABELLA, JAMES],
    activities: [
      'Frontend',
      'UI Design',
      'UX Research',
      'Prototyping',
      'Client Meeting',
    ],
  },
  {
    name: 'CRM System',
    clientName: 'Fintech Group',
    description: 'Customer relationship management for the sales team.',
    members: [JOHN, EMMA, UNASSIGNED],
    activities: ['Backend', 'Bug Fixing', 'Manual Testing', 'Client Meeting'],
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
    name: 'Patient Portal',
    clientName: 'Bluewave Health',
    description: 'Appointments and test results for patients.',
    members: [RACHEL, LEO, ZOE, MAX, RUBY],
    activities: [
      'Frontend',
      'UI Design',
      'Manual Testing',
      'Client Meeting',
      'Discovery Workshop',
    ],
  },
  {
    name: 'Mobile Banking App',
    clientName: 'Summit Bank',
    description: 'The bank’s iOS and Android apps.',
    members: [LEO, ZOE, MAX, AVA, GRACE],
    activities: [
      'Frontend',
      'Bug Fixing',
      'Manual Testing',
      'Test Automation',
      'Client Meeting',
    ],
  },
  {
    name: 'Fraud Analytics Platform',
    clientName: 'Summit Bank',
    description: 'Scores card payments for fraud in near real time.',
    members: [MICHAEL, SOPHIA, HARPER, ELLA, LEO, ISLA],
    activities: [
      'Backend',
      'Code Review',
      'Data Modelling',
      'Dashboard Building',
      'Client Meeting',
    ],
  },
  {
    name: 'Energy Usage Dashboard',
    clientName: 'Greenfield Energy',
    description: 'Household energy use, by tariff and by hour.',
    members: [HARPER, ELLA, ISABELLA, CHARLOTTE],
    activities: ['Dashboard Building', 'UI Design', 'Client Meeting'],
  },
  {
    name: 'Brand Refresh',
    clientName: 'Retail Corp',
    description: 'New logo, colours and tone of voice.',
    members: [CHARLOTTE, JAMES],
    activities: ['UI Design', 'Prototyping', 'Documentation'],
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
    name: 'Security Audit 2026',
    clientName: null,
    description: 'The yearly security and compliance review.',
    members: [MIA, GRACE, ISLA],
    activities: ['Security Review', 'Compliance Audit', 'Documentation'],
  },
  {
    name: 'Internal Training',
    clientName: null,
    description: 'Courses, workshops and conferences.',
    members: [SOPHIA, GRACE],
    activities: ['Training'],
  },
  {
    name: 'Team Management',
    clientName: null,
    description: 'Planning, one-to-ones and hiring.',
    members: [MANAGER, OLIVIA, MICHAEL, RACHEL, ETHAN],
    activities: ['Sprint Planning', 'Daily Standup', 'Documentation'],
  },
  {
    name: 'Website Relaunch 2025',
    clientName: 'Retail Corp',
    description: 'Finished and archived.',
    status: ProjectStatus.ARCHIVED,
    members: [JANE, DEACTIVATED],
    activities: ['Frontend', 'UI Design'],
  },
  {
    name: LONG_PROJECT,
    clientName: 'International Freight & Logistics Consolidated Holdings Ltd.',
    description: [
      '# Scope',
      '',
      'Connect the client’s **ERP** to their warehouses, carriers and customs brokers across fourteen countries, replacing nightly spreadsheet exports with live order and shipment updates.',
    ].join('\n'),
    members: [LONG_NAME],
    activities: [
      'Backend',
      'Customer Onboarding',
      'Client Meeting',
      'Performance Optimisation and Load Testing Across Environments',
      'Documentation',
    ],
    testOnly: true,
  },
];

export const PROJECTS = included(ALL_PROJECTS).map((project) => ({
  ...project,
  members: seededOnly(project.members),
}));

// ---------------------------------------------------------------------------
// Time, plans and absences.
// ---------------------------------------------------------------------------

export interface SeedWork {
  project: string;
  activity: string;
  minutes: number;
  /** Inclusive; open-ended when missing. */
  from?: string;
  to?: string;
}

export interface SeedPlan {
  project: string;
  minutes: number;
  from?: string;
  to?: string;
}

export interface SeedHistory {
  email: string;
  /** Logged on every working day from HISTORY_START up to yesterday. */
  work: SeedWork[];
  /** Planned on every working day from HISTORY_START up to PLANS_UNTIL. */
  plan: SeedPlan[];
  /** Working days with nothing logged. */
  missedDays?: string[];
  missesFridaysFrom?: string;
  weekendWork?: (SeedWork & { date: string })[];
  absences?: { type: AbsenceType; startDate: string; endDate: string }[];
}

/**
 * Each person logs `work` and is planned for `plan` on every working day, in
 * minutes, except their absences, the public holidays and the days the
 * exceptions name. A leaver's history ends on their last working day.
 *
 * The story: Fraud Analytics Platform runs above its plan and Brand Refresh
 * well below it; Internal Training is time with no plan; Liam, Zoe and Lucas
 * have days with no time in the last two weeks; Ruby has no plan after this
 * week and Charlotte is away next week; Ethan's plan stays at 8h a day after
 * his hours dropped.
 */
const ALL_HISTORY: SeedHistory[] = [
  {
    email: MANAGER,
    work: [
      { project: 'Team Management', activity: 'Sprint Planning', minutes: 180 },
      { project: 'Team Management', activity: 'Documentation', minutes: 180 },
      { project: 'Team Management', activity: 'Daily Standup', minutes: 120 },
    ],
    plan: [{ project: 'Team Management', minutes: 480 }],
  },
  {
    email: JOHN,
    work: [
      { project: 'CRM System', activity: 'Backend', minutes: 300 },
      { project: 'CRM System', activity: 'Bug Fixing', minutes: 120 },
      { project: 'CRM System', activity: 'Client Meeting', minutes: 60 },
    ],
    plan: [{ project: 'CRM System', minutes: 480 }],
  },
  {
    email: JANE,
    work: [
      {
        project: 'Customer Portal Redesign',
        activity: 'UI Design',
        minutes: 240,
      },
      {
        project: 'Customer Portal Redesign',
        activity: 'UX Research',
        minutes: 60,
      },
    ],
    plan: [{ project: 'Customer Portal Redesign', minutes: 300 }],
  },
  {
    email: LIAM,
    work: [
      {
        project: 'Customer Portal Redesign',
        activity: 'Frontend',
        minutes: 420,
      },
      {
        project: 'Customer Portal Redesign',
        activity: 'Client Meeting',
        minutes: 60,
      },
    ],
    plan: [{ project: 'Customer Portal Redesign', minutes: 480 }],
    missesFridaysFrom: LIAM_MISSES_FRIDAYS_FROM,
  },
  {
    email: EMMA,
    work: [
      {
        project: 'Data Warehouse Migration',
        activity: 'Backend',
        minutes: 300,
      },
      {
        project: 'Data Warehouse Migration',
        activity: 'Code Review',
        minutes: 60,
      },
      { project: 'CRM System', activity: 'Bug Fixing', minutes: 120 },
    ],
    plan: [
      { project: 'Data Warehouse Migration', minutes: 360 },
      { project: 'CRM System', minutes: 120 },
    ],
  },
  {
    email: AVA,
    work: [
      {
        project: 'Customer Portal Redesign',
        activity: 'Frontend',
        minutes: 240,
      },
      { project: 'Mobile Banking App', activity: 'Frontend', minutes: 240 },
    ],
    plan: [
      { project: 'Customer Portal Redesign', minutes: 240 },
      { project: 'Mobile Banking App', minutes: 240 },
    ],
    absences: [
      {
        type: AbsenceType.VACATION,
        startDate: weekDay(-9, MONDAY),
        endDate: weekDay(-9, FRIDAY),
      },
    ],
  },
  {
    email: OLIVIA,
    work: [
      { project: 'Team Management', activity: 'Sprint Planning', minutes: 120 },
      { project: 'Team Management', activity: 'Documentation', minutes: 120 },
      {
        project: 'Customer Portal Redesign',
        activity: 'UX Research',
        minutes: 240,
      },
    ],
    plan: [
      { project: 'Team Management', minutes: 240 },
      { project: 'Customer Portal Redesign', minutes: 240 },
    ],
  },
  {
    email: ISABELLA,
    work: [
      {
        project: 'Customer Portal Redesign',
        activity: 'UI Design',
        minutes: 240,
      },
      {
        project: 'Customer Portal Redesign',
        activity: 'Prototyping',
        minutes: 120,
      },
      {
        project: 'Energy Usage Dashboard',
        activity: 'UI Design',
        minutes: 120,
      },
    ],
    plan: [
      { project: 'Customer Portal Redesign', minutes: 360 },
      { project: 'Energy Usage Dashboard', minutes: 120 },
    ],
  },
  {
    email: JAMES,
    work: [
      { project: 'Brand Refresh', activity: 'UI Design', minutes: 120 },
      {
        project: 'Customer Portal Redesign',
        activity: 'Prototyping',
        minutes: 360,
      },
    ],
    plan: [
      { project: 'Brand Refresh', minutes: 240 },
      { project: 'Customer Portal Redesign', minutes: 240 },
    ],
  },
  {
    email: CHARLOTTE,
    work: [
      { project: 'Brand Refresh', activity: 'UI Design', minutes: 240 },
      { project: 'Brand Refresh', activity: 'Prototyping', minutes: 120 },
      {
        project: 'Energy Usage Dashboard',
        activity: 'UI Design',
        minutes: 120,
      },
    ],
    plan: [{ project: 'Brand Refresh', minutes: 480 }],
    absences: [
      {
        type: AbsenceType.VACATION,
        startDate: weekDay(1, MONDAY),
        endDate: weekDay(1, FRIDAY),
      },
    ],
  },
  {
    email: MICHAEL,
    work: [
      { project: 'Team Management', activity: 'Sprint Planning', minutes: 120 },
      {
        project: 'Fraud Analytics Platform',
        activity: 'Code Review',
        minutes: 180,
      },
      {
        project: 'Fraud Analytics Platform',
        activity: 'Client Meeting',
        minutes: 60,
      },
      {
        project: 'Fraud Analytics Platform',
        activity: 'Data Modelling',
        minutes: 120,
      },
    ],
    plan: [
      { project: 'Team Management', minutes: 120 },
      { project: 'Fraud Analytics Platform', minutes: 300 },
    ],
  },
  {
    email: SOPHIA,
    work: [
      {
        project: 'Fraud Analytics Platform',
        activity: 'Backend',
        minutes: 360,
      },
      {
        project: 'Fraud Analytics Platform',
        activity: 'Data Modelling',
        minutes: 60,
      },
      { project: 'Internal Training', activity: 'Training', minutes: 60 },
    ],
    plan: [{ project: 'Fraud Analytics Platform', minutes: 360 }],
    absences: [
      {
        type: AbsenceType.SICK_LEAVE,
        startDate: weekDay(-3, THURSDAY),
        endDate: weekDay(-3, FRIDAY),
      },
    ],
  },
  {
    email: HARPER,
    work: [
      {
        project: 'Fraud Analytics Platform',
        activity: 'Dashboard Building',
        minutes: 240,
      },
      {
        project: 'Energy Usage Dashboard',
        activity: 'Dashboard Building',
        minutes: 240,
      },
    ],
    plan: [
      { project: 'Fraud Analytics Platform', minutes: 180 },
      { project: 'Energy Usage Dashboard', minutes: 300 },
    ],
  },
  {
    email: ELLA,
    work: [
      {
        project: 'Fraud Analytics Platform',
        activity: 'Data Modelling',
        minutes: 300,
      },
      {
        project: 'Energy Usage Dashboard',
        activity: 'Dashboard Building',
        minutes: 180,
      },
    ],
    plan: [
      { project: 'Fraud Analytics Platform', minutes: 240 },
      { project: 'Energy Usage Dashboard', minutes: 240 },
    ],
  },
  {
    email: LEO,
    work: [
      {
        project: 'Patient Portal',
        activity: 'Frontend',
        minutes: 240,
        to: addDays(LEO_MOVED_ON, -1),
      },
      {
        project: 'Mobile Banking App',
        activity: 'Frontend',
        minutes: 240,
        to: addDays(LEO_MOVED_ON, -1),
      },
      {
        project: 'Fraud Analytics Platform',
        activity: 'Backend',
        minutes: 480,
        from: LEO_MOVED_ON,
      },
    ],
    plan: [
      {
        project: 'Patient Portal',
        minutes: 240,
        to: addDays(LEO_MOVED_ON, -1),
      },
      {
        project: 'Mobile Banking App',
        minutes: 240,
        to: addDays(LEO_MOVED_ON, -1),
      },
      {
        project: 'Fraud Analytics Platform',
        minutes: 420,
        from: LEO_MOVED_ON,
      },
    ],
  },
  {
    email: ISLA,
    work: [
      {
        project: 'Security Audit 2026',
        activity: 'Security Review',
        minutes: 240,
      },
      {
        project: 'Fraud Analytics Platform',
        activity: 'Data Modelling',
        minutes: 240,
      },
    ],
    plan: [
      { project: 'Security Audit 2026', minutes: 240 },
      { project: 'Fraud Analytics Platform', minutes: 240 },
    ],
  },
  {
    email: RACHEL,
    work: [
      { project: 'Team Management', activity: 'Sprint Planning', minutes: 120 },
      { project: 'Patient Portal', activity: 'Client Meeting', minutes: 120 },
      {
        project: 'Patient Portal',
        activity: 'Discovery Workshop',
        minutes: 120,
      },
      { project: 'Patient Portal', activity: 'Manual Testing', minutes: 120 },
    ],
    plan: [
      { project: 'Team Management', minutes: 120 },
      { project: 'Patient Portal', minutes: 360 },
    ],
  },
  {
    email: ZOE,
    work: [
      { project: 'Mobile Banking App', activity: 'Frontend', minutes: 300 },
      { project: 'Mobile Banking App', activity: 'Bug Fixing', minutes: 60 },
      { project: 'Patient Portal', activity: 'Frontend', minutes: 120 },
    ],
    plan: [
      { project: 'Mobile Banking App', minutes: 360 },
      { project: 'Patient Portal', minutes: 120 },
    ],
    missedDays: [weekDay(-1, TUESDAY), weekDay(-1, WEDNESDAY)],
  },
  {
    email: MAX,
    work: [
      { project: 'Patient Portal', activity: 'Manual Testing', minutes: 240 },
      {
        project: 'Mobile Banking App',
        activity: 'Manual Testing',
        minutes: 240,
      },
    ],
    plan: [
      { project: 'Patient Portal', minutes: 240 },
      { project: 'Mobile Banking App', minutes: 240 },
    ],
    absences: [
      {
        type: AbsenceType.VACATION,
        startDate: weekDay(-14, MONDAY),
        endDate: weekDay(-13, FRIDAY),
      },
    ],
  },
  {
    email: RUBY,
    work: [
      { project: 'Patient Portal', activity: 'UI Design', minutes: 360 },
      {
        project: 'Patient Portal',
        activity: 'Discovery Workshop',
        minutes: 120,
      },
    ],
    plan: [{ project: 'Patient Portal', minutes: 480, to: RUBY_PLANNED_UNTIL }],
  },
  {
    email: ETHAN,
    work: [
      { project: 'Team Management', activity: 'Sprint Planning', minutes: 60 },
      {
        project: 'Cloud Infrastructure',
        activity: 'Deployment',
        minutes: 240,
        to: addDays(ETHAN_HOURS_DROP_ON, -1),
      },
      {
        project: 'Cloud Infrastructure',
        activity: 'Deployment',
        minutes: 150,
        from: ETHAN_HOURS_DROP_ON,
      },
      {
        project: 'Cloud Infrastructure',
        activity: 'Monitoring and Alerting',
        minutes: 120,
      },
      {
        project: 'Cloud Infrastructure',
        activity: 'Documentation',
        minutes: 60,
      },
    ],
    // Left at 8h a day when his hours dropped, so Planning shows him over.
    plan: [
      { project: 'Team Management', minutes: 60 },
      { project: 'Cloud Infrastructure', minutes: 420 },
    ],
  },
  {
    email: MIA,
    work: [
      { project: 'Cloud Infrastructure', activity: 'Deployment', minutes: 240 },
      {
        project: 'Cloud Infrastructure',
        activity: 'Incident Response',
        minutes: 120,
      },
      {
        project: 'Security Audit 2026',
        activity: 'Security Review',
        minutes: 120,
      },
    ],
    plan: [
      { project: 'Cloud Infrastructure', minutes: 360 },
      { project: 'Security Audit 2026', minutes: 120 },
    ],
  },
  {
    email: LUCAS,
    work: [
      {
        project: 'Data Warehouse Migration',
        activity: 'Deployment',
        minutes: 240,
      },
      {
        project: 'Data Warehouse Migration',
        activity: 'Bug Fixing',
        minutes: 60,
      },
      {
        project: 'Cloud Infrastructure',
        activity: 'Monitoring and Alerting',
        minutes: 180,
      },
    ],
    plan: [
      { project: 'Data Warehouse Migration', minutes: 240 },
      { project: 'Cloud Infrastructure', minutes: 240 },
    ],
    missedDays: [lastWorkingDayBefore(SEED_TODAY)],
    weekendWork: [
      {
        project: 'Cloud Infrastructure',
        activity: 'Incident Response',
        minutes: 180,
        date: weekDay(-3, SATURDAY),
      },
    ],
  },
  {
    email: GRACE,
    work: [
      {
        project: 'Mobile Banking App',
        activity: 'Manual Testing',
        minutes: 120,
      },
      {
        project: 'Mobile Banking App',
        activity: 'Test Automation',
        minutes: 120,
      },
      {
        project: 'Security Audit 2026',
        activity: 'Compliance Audit',
        minutes: 180,
      },
      { project: 'Internal Training', activity: 'Training', minutes: 60 },
    ],
    plan: [
      { project: 'Mobile Banking App', minutes: 240 },
      { project: 'Security Audit 2026', minutes: 240 },
    ],
  },
  {
    // Logs twice the plan on CRM System, which only the owner sees.
    email: UNASSIGNED,
    work: [{ project: 'CRM System', activity: 'Manual Testing', minutes: 480 }],
    plan: [{ project: 'CRM System', minutes: 240 }],
  },
  {
    email: LONG_NAME,
    work: [
      { project: LONG_PROJECT, activity: 'Backend', minutes: 300 },
      { project: LONG_PROJECT, activity: 'Client Meeting', minutes: 60 },
      { project: LONG_PROJECT, activity: 'Documentation', minutes: 120 },
    ],
    plan: [{ project: LONG_PROJECT, minutes: 480 }],
  },
];

export const REPORT_HISTORY = ALL_HISTORY.filter((person) =>
  SEEDED_EMAILS.has(person.email),
);

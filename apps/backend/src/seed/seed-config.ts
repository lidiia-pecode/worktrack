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
 * categories to judge the Manage lists: archived and deactivated ones, an
 * empty category and long names, and enough history since July 2026 to
 * judge Reports (see REPORT_HISTORY). The seed writes straight to the tables,
 * so this data keeps the app's rules itself.
 */

export const SEED_PASSWORD = 'Password123!';

/**
 * The company's first month is the first one Reports and Periods offer, so it
 * starts a month before the history: June is there, and empty. Everyone joined
 * that day, so their expected hours start there too.
 */
export const CAPACITY_VALID_FROM = '2026-06-01';

export const COMPANY_CREATED_AT = new Date(`${CAPACITY_VALID_FROM}T00:00:00Z`);

export const ACCOUNTS_CREATED_AT = COMPANY_CREATED_AT;

export const COMPANY = {
  companyName: 'WorkTrack Demo',
  slug: 'worktrack-demo',
  timezone: 'UTC',
  currency: 'USD',
  weekStartDay: WeekDay.MONDAY,
  standardWorkHoursPerDay: 8,
  createdAt: COMPANY_CREATED_AT,
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

// More people, so the owner's Reports show a company of about forty.
const MICHAEL = 'michael.hart@worktrack.test';
const SOPHIA = 'sophia.reynolds@worktrack.test';
const OLIVER = 'oliver.grant@worktrack.test';
const HARPER = 'harper.lewis@worktrack.test';
const JACK = 'jack.wilson@worktrack.test';
const ELLA = 'ella.bailey@worktrack.test';
const NATHAN = 'nathan.cole@worktrack.test';
const ISLA = 'isla.robinson@worktrack.test';
const RACHEL = 'rachel.dawson@worktrack.test';
const LEO = 'leo.harrison@worktrack.test';
const ZOE = 'zoe.palmer@worktrack.test';
const MAX = 'max.fletcher@worktrack.test';
const RUBY = 'ruby.saunders@worktrack.test';
const LILY = 'lily.spencer@worktrack.test';
const TOBY = 'toby.marshall@worktrack.test';
const FREYA = 'freya.watson@worktrack.test';
const OSCAR = 'oscar.barnes@worktrack.test';

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
  /** The day they joined, when it isn't the accounts' default; expected hours start here. */
  joinedOn?: string;
  /** A later contract: the weekly hours from a date on. */
  capacityFrom?: { validFrom: string; hoursPerWeek: number };
  /** The day a deactivated account was deactivated; nothing is expected from it. */
  deactivatedOn?: string;
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
    capacityFrom: { validFrom: '2026-09-01', hoursPerWeek: 32 },
    note: 'Down to 32h a week from 1 September, with his 40h plan left as it was.',
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
  {
    email: MICHAEL,
    firstName: 'Michael',
    lastName: 'Hart',
    role: UserRole.MANAGER,
    position: 'Head of Data',
    capacityHoursPerWeek: 40,
    note: 'Leads Data and Analytics.',
  },
  {
    email: SOPHIA,
    firstName: 'Sophia',
    lastName: 'Reynolds',
    role: UserRole.EMPLOYEE,
    position: 'Data Analyst',
    capacityHoursPerWeek: 40,
  },
  {
    email: OLIVER,
    firstName: 'Oliver',
    lastName: 'Grant',
    role: UserRole.EMPLOYEE,
    position: 'Data Engineer',
    capacityHoursPerWeek: 40,
  },
  {
    email: HARPER,
    firstName: 'Harper',
    lastName: 'Lewis',
    role: UserRole.EMPLOYEE,
    position: 'Analytics Engineer',
    capacityHoursPerWeek: 40,
  },
  {
    email: JACK,
    firstName: 'Jack',
    lastName: 'Wilson',
    role: UserRole.EMPLOYEE,
    position: 'Data Scientist',
    capacityHoursPerWeek: 40,
  },
  {
    email: ELLA,
    firstName: 'Ella',
    lastName: 'Bailey',
    role: UserRole.EMPLOYEE,
    position: 'BI Developer',
    capacityHoursPerWeek: 32,
  },
  {
    email: NATHAN,
    firstName: 'Nathan',
    lastName: 'Cole',
    role: UserRole.EMPLOYEE,
    position: 'Security Engineer',
    capacityHoursPerWeek: 40,
  },
  {
    email: ISLA,
    firstName: 'Isla',
    lastName: 'Robinson',
    role: UserRole.EMPLOYEE,
    status: UserStatus.DEACTIVATED,
    deactivatedOn: '2026-08-29',
    position: 'Compliance Analyst',
    capacityHoursPerWeek: 40,
    note: 'Left at the end of August: time in July and August only.',
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
    email: LEO,
    firstName: 'Leo',
    lastName: 'Harrison',
    role: UserRole.EMPLOYEE,
    position: 'iOS Developer',
    capacityHoursPerWeek: 40,
  },
  {
    email: ZOE,
    firstName: 'Zoe',
    lastName: 'Palmer',
    role: UserRole.EMPLOYEE,
    position: 'Android Developer',
    capacityHoursPerWeek: 40,
  },
  {
    email: MAX,
    firstName: 'Max',
    lastName: 'Fletcher',
    role: UserRole.EMPLOYEE,
    position: 'Mobile QA Engineer',
    capacityHoursPerWeek: 40,
  },
  {
    email: RUBY,
    firstName: 'Ruby',
    lastName: 'Saunders',
    role: UserRole.EMPLOYEE,
    position: 'Product Designer',
    capacityHoursPerWeek: 40,
    joinedOn: '2026-09-14',
    note: 'Joined on 14 September 2026: nothing expected before.',
  },
  {
    email: LILY,
    firstName: 'Lily',
    lastName: 'Spencer',
    role: UserRole.EMPLOYEE,
    position: 'Marketing Manager',
    capacityHoursPerWeek: 40,
  },
  {
    email: TOBY,
    firstName: 'Toby',
    lastName: 'Marshall',
    role: UserRole.EMPLOYEE,
    position: 'Content Strategist',
    capacityHoursPerWeek: 40,
  },
  {
    email: FREYA,
    firstName: 'Freya',
    lastName: 'Watson',
    role: UserRole.EMPLOYEE,
    position: 'SEO Specialist',
    capacityHoursPerWeek: 20,
  },
  {
    email: OSCAR,
    firstName: 'Oscar',
    lastName: 'Barnes',
    role: UserRole.EMPLOYEE,
    position: 'Marketing Designer',
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
    name: 'Data and Analytics',
    members: [
      { email: MICHAEL, roleInTeam: TeamRole.MANAGER },
      { email: SOPHIA, roleInTeam: TeamRole.MEMBER },
      { email: OLIVER, roleInTeam: TeamRole.MEMBER },
      { email: HARPER, roleInTeam: TeamRole.MEMBER },
      { email: JACK, roleInTeam: TeamRole.MEMBER },
      { email: ELLA, roleInTeam: TeamRole.MEMBER },
      { email: NATHAN, roleInTeam: TeamRole.MEMBER },
      { email: ISLA, roleInTeam: TeamRole.MEMBER },
    ],
  },
  {
    name: 'Mobile Squad',
    members: [
      { email: RACHEL, roleInTeam: TeamRole.MANAGER },
      { email: LEO, roleInTeam: TeamRole.MEMBER },
      { email: ZOE, roleInTeam: TeamRole.MEMBER },
      { email: MAX, roleInTeam: TeamRole.MEMBER },
      { email: RUBY, roleInTeam: TeamRole.MEMBER },
    ],
  },
  {
    name: 'Growth and Marketing',
    members: [
      { email: SECOND_MANAGER_EMAIL, roleInTeam: TeamRole.MANAGER },
      { email: LILY, roleInTeam: TeamRole.MEMBER },
      { email: TOBY, roleInTeam: TeamRole.MEMBER },
      { email: FREYA, roleInTeam: TeamRole.MEMBER },
      { email: OSCAR, roleInTeam: TeamRole.MEMBER },
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
  // Enough categories with time for Reports to show more than six.
  { name: 'Research and Discovery' },
  { name: 'Data and Analytics' },
  { name: 'Marketing' },
  { name: 'Security and Compliance' },
  { name: 'Training and Learning' },
  { name: 'Legacy Training', status: ActCategoryStatus.ARCHIVED },
];

export interface SeedActivity {
  name: string;
  category: string;
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
  { name: 'Proposal Writing', category: 'Sales', billable: false },
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
  { name: 'Campaign Work', category: 'Marketing', billable: false },
  { name: 'Content Writing', category: 'Marketing', billable: false },
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
  { name: 'Hackathon', category: 'Training and Learning', billable: false },
  {
    name: 'Conference Talk Preparation',
    category: 'Training and Learning',
    billable: false,
  },
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
 * Mostly employees; the managers are on Team Management, where they log their
 * own time, as a manager can add themselves to a project. A deactivated member
 * stays, as the app keeps them.
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
    name: 'Patient Portal',
    clientName: 'Bluewave Health',
    description: 'Appointments and test results for patients.',
    members: [LEO, ZOE, MAX, RUBY, RACHEL],
    activities: [
      'Frontend',
      'UI Design',
      'Manual Testing',
      'Client Meeting',
      'Discovery Workshop',
    ],
  },
  {
    name: 'Fraud Analytics Platform',
    clientName: 'Summit Bank',
    description: 'Scores card payments for fraud in near real time.',
    members: [SOPHIA, OLIVER, HARPER, JACK, ELLA, MICHAEL],
    activities: [
      'Backend',
      'Code Review',
      'Data Modelling',
      'Dashboard Building',
      'Client Meeting',
    ],
  },
  {
    name: 'Mobile Banking App',
    clientName: 'Summit Bank',
    description: 'The bank’s iOS and Android apps.',
    members: [LEO, ZOE, MAX, AVA],
    activities: ['Frontend', 'Bug Fixing', 'Manual Testing', 'Client Meeting'],
  },
  {
    name: 'Energy Usage Dashboard',
    clientName: 'Greenfield Energy',
    description: 'Household energy use, by tariff and by hour.',
    members: [HARPER, ELLA, OSCAR],
    activities: ['Dashboard Building', 'UI Design', 'Client Meeting'],
  },
  {
    name: 'Marketing Website',
    clientName: null,
    description: 'Our own website and campaigns.',
    members: [LILY, TOBY, FREYA, OSCAR, CHARLOTTE],
    activities: ['Campaign Work', 'Content Writing', 'UI Design'],
  },
  {
    name: 'Security Audit 2026',
    clientName: null,
    description: 'The yearly security and compliance review.',
    members: [NATHAN, ISLA, MIA],
    activities: ['Security Review', 'Compliance Audit', 'Documentation'],
  },
  {
    name: 'Internal Training',
    clientName: null,
    description: 'Courses, workshops and conferences.',
    members: [AMELIA, HARPER, LILY, TOBY],
    activities: ['Training'],
  },
  {
    name: 'Sales Proposals',
    clientName: null,
    description: 'Proposals and estimates for new clients.',
    members: [BENJAMIN, LILY],
    activities: ['Proposal Writing'],
  },
  {
    name: 'Team Management',
    clientName: null,
    description: 'Planning, one-to-ones and hiring.',
    members: [MANAGER_EMAIL, SECOND_MANAGER_EMAIL, MICHAEL, RACHEL],
    activities: ['Sprint Planning', 'Daily Standup', 'Documentation'],
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

/** Planned hours for the same week, so Reports have a plan beside the time. */
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

/**
 * Reports' history, from HISTORY_START up to yesterday (the accounts with time
 * this week above stop the Sunday before it). Each person logs `work` and is
 * planned for `plan` on every working day, in minutes, except the days the
 * exceptions name; plans run to the end of the current month. Fixed dates
 * keep July to September the same on every reset.
 *
 * What it shows: projects over and under plan (CRM System, Data Warehouse
 * Migration, Brand Refresh / Customer Portal Redesign, Energy Usage
 * Dashboard), time with no plan (Support Desk, Internal Training), a plan
 * beyond expected hours (Ethan from September), more than expected (Emma),
 * days with no time (Liam's Fridays, Noah, Samuel, the owner), a joiner
 * (Ruby), a leaver with time (Isla) and one with only a plan left (Chloe),
 * absences, a public holiday, weekend work and thirteen categories.
 */
export const HISTORY_START = '2026-07-01';

/** Everybody's day off, except whoever works it. */
export const PUBLIC_HOLIDAYS = ['2026-08-31'];

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
  work: SeedWork[];
  plan: SeedPlan[];
  /** Working days with nothing logged. */
  missedDays?: string[];
  missesFridaysFrom?: string;
  /** Nothing logged from this day on. */
  stopsLoggingOn?: string;
  /** A leaver's last day: no time or plans after it. */
  leftOn?: string;
  worksPublicHolidays?: boolean;
  weekendWork?: (SeedWork & { date: string })[];
  absences?: { type: AbsenceType; startDate: string; endDate: string }[];
}

export const REPORT_HISTORY: SeedHistory[] = [
  // Owners rarely log time; Reports show what that looks like.
  { email: OWNER_EMAIL, work: [], plan: [] },
  {
    email: MANAGER_EMAIL,
    work: [
      { project: 'Team Management', activity: 'Sprint Planning', minutes: 120 },
      { project: 'Team Management', activity: 'Documentation', minutes: 120 },
      { project: 'Team Management', activity: 'Daily Standup', minutes: 60 },
    ],
    plan: [{ project: 'Team Management', minutes: 300 }],
  },
  {
    email: DEV_EMAIL,
    work: [
      { project: 'WorkTrack', activity: 'Backend', minutes: 330 },
      { project: 'WorkTrack', activity: 'Daily Standup', minutes: 30 },
      { project: 'CRM System', activity: 'Bug Fixing', minutes: 120 },
    ],
    plan: [
      { project: 'WorkTrack', minutes: 360 },
      { project: 'CRM System', minutes: 120 },
    ],
  },
  {
    email: DESIGNER_EMAIL,
    work: [
      { project: 'Mobile App', activity: 'UI Design', minutes: 180 },
      { project: 'Mobile App', activity: 'UX Research', minutes: 108 },
    ],
    plan: [{ project: 'Mobile App', minutes: 288 }],
  },
  {
    // Logs twice the plan on CRM System, which only the owner sees.
    email: UNASSIGNED_EMAIL,
    work: [{ project: 'CRM System', activity: 'Manual Testing', minutes: 480 }],
    plan: [{ project: 'CRM System', minutes: 240 }],
  },
  {
    email: SECOND_MANAGER_EMAIL,
    work: [
      { project: 'Team Management', activity: 'Sprint Planning', minutes: 180 },
      { project: 'Team Management', activity: 'Documentation', minutes: 180 },
    ],
    plan: [{ project: 'Team Management', minutes: 360 }],
  },
  {
    // Planned only for September, after leaving: a plan left behind.
    email: DEACTIVATED_EMAIL,
    work: [],
    plan: [
      {
        project: 'Support Desk',
        minutes: 240,
        from: '2026-09-01',
        to: '2026-09-30',
      },
    ],
  },
  {
    email: LONG_NAME_EMAIL,
    work: [
      {
        project:
          'Enterprise Resource Planning Integration for Global Logistics Operations',
        activity: 'Backend',
        minutes: 300,
      },
      {
        project:
          'Enterprise Resource Planning Integration for Global Logistics Operations',
        activity: 'Client Meeting',
        minutes: 60,
      },
      {
        project:
          'Enterprise Resource Planning Integration for Global Logistics Operations',
        activity: 'Documentation',
        minutes: 120,
      },
    ],
    plan: [
      {
        project:
          'Enterprise Resource Planning Integration for Global Logistics Operations',
        minutes: 480,
      },
    ],
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
    missesFridaysFrom: '2026-09-01',
  },
  {
    // Nine hours a day: more than expected, which Reports never flag.
    email: EMMA,
    work: [
      {
        project: 'Data Warehouse Migration',
        activity: 'Backend',
        minutes: 420,
      },
      {
        project: 'Data Warehouse Migration',
        activity: 'Code Review',
        minutes: 60,
      },
      {
        project: 'Data Warehouse Migration',
        activity: 'Deployment',
        minutes: 60,
      },
    ],
    plan: [{ project: 'Data Warehouse Migration', minutes: 360 }],
    absences: [
      {
        type: AbsenceType.SICK_LEAVE,
        startDate: '2026-09-08',
        endDate: '2026-09-09',
      },
    ],
  },
  {
    email: NOAH,
    work: [
      {
        project:
          'Enterprise Resource Planning Integration for Global Logistics Operations',
        activity: 'Backend',
        minutes: 300,
      },
      {
        project:
          'Enterprise Resource Planning Integration for Global Logistics Operations',
        activity: 'Manual Testing',
        minutes: 84,
      },
    ],
    plan: [
      {
        project:
          'Enterprise Resource Planning Integration for Global Logistics Operations',
        minutes: 384,
      },
    ],
    missedDays: ['2026-10-01', '2026-10-02', '2026-10-15'],
  },
  {
    email: AVA,
    work: [
      {
        project: 'Customer Portal Redesign',
        activity: 'Frontend',
        minutes: 240,
      },
      {
        project: 'Customer Portal Redesign',
        activity: 'UI Design',
        minutes: 120,
      },
      { project: 'Mobile Banking App', activity: 'Frontend', minutes: 120 },
    ],
    plan: [
      { project: 'Customer Portal Redesign', minutes: 360 },
      { project: 'Mobile Banking App', minutes: 120 },
    ],
    absences: [
      {
        type: AbsenceType.VACATION,
        startDate: '2026-08-10',
        endDate: '2026-08-21',
      },
    ],
  },
  {
    // A 40h plan kept after the contract went down to 32h on 1 September.
    email: ETHAN,
    work: [
      {
        project: 'Cloud Infrastructure',
        activity: 'Deployment',
        minutes: 240,
        to: '2026-08-31',
      },
      {
        project: 'Cloud Infrastructure',
        activity: 'Monitoring and Alerting',
        minutes: 120,
        to: '2026-08-31',
      },
      {
        project: 'Cloud Infrastructure',
        activity: 'Incident Response',
        minutes: 120,
        to: '2026-08-31',
      },
      {
        project: 'Cloud Infrastructure',
        activity: 'Deployment',
        minutes: 192,
        from: '2026-09-01',
      },
      {
        project: 'Cloud Infrastructure',
        activity: 'Monitoring and Alerting',
        minutes: 96,
        from: '2026-09-01',
      },
      {
        project: 'Cloud Infrastructure',
        activity: 'Incident Response',
        minutes: 96,
        from: '2026-09-01',
      },
    ],
    plan: [{ project: 'Cloud Infrastructure', minutes: 480 }],
  },
  {
    // On call: works the public holiday and one Saturday.
    email: MIA,
    work: [
      {
        project: 'Cloud Infrastructure',
        activity: 'Monitoring and Alerting',
        minutes: 240,
      },
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
    worksPublicHolidays: true,
    weekendWork: [
      {
        date: '2026-09-19',
        project: 'Cloud Infrastructure',
        activity: 'Incident Response',
        minutes: 180,
      },
    ],
  },
  {
    email: LUCAS,
    work: [
      {
        project: 'Data Warehouse Migration',
        activity: 'Backend',
        minutes: 240,
      },
      {
        project: 'Data Warehouse Migration',
        activity: 'Bug Fixing',
        minutes: 120,
      },
      { project: 'Cloud Infrastructure', activity: 'Deployment', minutes: 120 },
    ],
    plan: [
      { project: 'Data Warehouse Migration', minutes: 300 },
      { project: 'Cloud Infrastructure', minutes: 180 },
    ],
    absences: [
      {
        type: AbsenceType.VACATION,
        startDate: '2026-07-20',
        endDate: '2026-07-24',
      },
    ],
  },
  {
    email: ISABELLA,
    work: [
      {
        project: 'Customer Portal Redesign',
        activity: 'UX Research',
        minutes: 180,
      },
      {
        project: 'Customer Portal Redesign',
        activity: 'Prototyping',
        minutes: 108,
      },
    ],
    plan: [{ project: 'Customer Portal Redesign', minutes: 288 }],
    absences: [
      {
        type: AbsenceType.VACATION,
        startDate: '2026-08-03',
        endDate: '2026-08-07',
      },
    ],
  },
  {
    // Planned mostly on the portal, but works mostly on the brand.
    email: JAMES,
    work: [
      {
        project: 'Customer Portal Redesign',
        activity: 'UI Design',
        minutes: 240,
      },
      { project: 'Brand Refresh', activity: 'UI Design', minutes: 240 },
    ],
    plan: [
      { project: 'Customer Portal Redesign', minutes: 360 },
      { project: 'Brand Refresh', minutes: 120 },
    ],
  },
  {
    email: CHARLOTTE,
    work: [
      { project: 'Brand Refresh', activity: 'Documentation', minutes: 120 },
      { project: 'Brand Refresh', activity: 'Prototyping', minutes: 144 },
      {
        project: 'Marketing Website',
        activity: 'Content Writing',
        minutes: 120,
      },
    ],
    plan: [
      { project: 'Brand Refresh', minutes: 264 },
      { project: 'Marketing Website', minutes: 120 },
    ],
  },
  {
    email: BENJAMIN,
    work: [
      {
        project: 'Support Desk',
        activity: 'Customer Onboarding',
        minutes: 120,
      },
      {
        project:
          'Enterprise Resource Planning Integration for Global Logistics Operations',
        activity: 'Customer Onboarding',
        minutes: 240,
      },
      {
        project: 'Sales Proposals',
        activity: 'Proposal Writing',
        minutes: 120,
      },
    ],
    plan: [
      {
        project:
          'Enterprise Resource Planning Integration for Global Logistics Operations',
        minutes: 240,
      },
      { project: 'Sales Proposals', minutes: 120 },
    ],
    absences: [
      {
        type: AbsenceType.SICK_LEAVE,
        startDate: '2026-10-05',
        endDate: '2026-10-05',
      },
    ],
  },
  {
    // Support is never planned.
    email: AMELIA,
    work: [
      { project: 'Support Desk', activity: 'Support Tickets', minutes: 420 },
      { project: 'Internal Training', activity: 'Training', minutes: 60 },
    ],
    plan: [],
  },
  {
    email: HENRY,
    work: [
      { project: 'Support Desk', activity: 'Support Tickets', minutes: 240 },
    ],
    plan: [],
  },
  {
    email: GRACE,
    work: [
      {
        project: 'QA Automation Suite',
        activity: 'Test Automation',
        minutes: 240,
      },
      {
        project:
          'Enterprise Resource Planning Integration for Global Logistics Operations',
        activity: 'Manual Testing',
        minutes: 240,
      },
    ],
    plan: [
      { project: 'QA Automation Suite', minutes: 240 },
      {
        project:
          'Enterprise Resource Planning Integration for Global Logistics Operations',
        minutes: 240,
      },
    ],
  },
  {
    // Stopped logging on 12 October.
    email: SAMUEL,
    work: [
      {
        project: 'QA Automation Suite',
        activity: 'Test Automation',
        minutes: 360,
      },
      {
        project:
          'Enterprise Resource Planning Integration for Global Logistics Operations',
        activity:
          'Performance Optimisation and Load Testing Across Environments',
        minutes: 120,
      },
    ],
    plan: [
      { project: 'QA Automation Suite', minutes: 360 },
      {
        project:
          'Enterprise Resource Planning Integration for Global Logistics Operations',
        minutes: 120,
      },
    ],
    stopsLoggingOn: '2026-10-12',
  },
  {
    email: MICHAEL,
    work: [
      { project: 'Team Management', activity: 'Sprint Planning', minutes: 120 },
      { project: 'Team Management', activity: 'Documentation', minutes: 120 },
      {
        project: 'Fraud Analytics Platform',
        activity: 'Client Meeting',
        minutes: 120,
      },
    ],
    plan: [
      { project: 'Team Management', minutes: 240 },
      { project: 'Fraud Analytics Platform', minutes: 120 },
    ],
  },
  {
    email: SOPHIA,
    work: [
      {
        project: 'Fraud Analytics Platform',
        activity: 'Data Modelling',
        minutes: 300,
      },
      {
        project: 'Fraud Analytics Platform',
        activity: 'Dashboard Building',
        minutes: 180,
      },
    ],
    plan: [{ project: 'Fraud Analytics Platform', minutes: 480 }],
  },
  {
    email: OLIVER,
    work: [
      {
        project: 'Fraud Analytics Platform',
        activity: 'Backend',
        minutes: 360,
      },
      {
        project: 'Fraud Analytics Platform',
        activity: 'Code Review',
        minutes: 120,
      },
    ],
    plan: [{ project: 'Fraud Analytics Platform', minutes: 480 }],
  },
  {
    email: HARPER,
    work: [
      {
        project: 'Fraud Analytics Platform',
        activity: 'Data Modelling',
        minutes: 240,
      },
      {
        project: 'Energy Usage Dashboard',
        activity: 'Dashboard Building',
        minutes: 180,
      },
      { project: 'Internal Training', activity: 'Training', minutes: 60 },
    ],
    plan: [
      { project: 'Fraud Analytics Platform', minutes: 240 },
      { project: 'Energy Usage Dashboard', minutes: 240 },
    ],
  },
  {
    email: JACK,
    work: [
      {
        project: 'Fraud Analytics Platform',
        activity: 'Dashboard Building',
        minutes: 240,
      },
      {
        project: 'Fraud Analytics Platform',
        activity: 'Data Modelling',
        minutes: 240,
      },
    ],
    plan: [{ project: 'Fraud Analytics Platform', minutes: 480 }],
  },
  {
    // Planned full-time on the dashboard, half of it goes to fraud work.
    email: ELLA,
    work: [
      {
        project: 'Energy Usage Dashboard',
        activity: 'Dashboard Building',
        minutes: 192,
      },
      {
        project: 'Fraud Analytics Platform',
        activity: 'Dashboard Building',
        minutes: 192,
      },
    ],
    plan: [{ project: 'Energy Usage Dashboard', minutes: 384 }],
  },
  {
    email: NATHAN,
    work: [
      {
        project: 'Security Audit 2026',
        activity: 'Security Review',
        minutes: 360,
      },
      {
        project: 'Security Audit 2026',
        activity: 'Compliance Audit',
        minutes: 120,
      },
    ],
    plan: [{ project: 'Security Audit 2026', minutes: 480 }],
  },
  {
    email: ISLA,
    work: [
      {
        project: 'Security Audit 2026',
        activity: 'Compliance Audit',
        minutes: 480,
      },
    ],
    plan: [{ project: 'Security Audit 2026', minutes: 480 }],
    leftOn: '2026-08-28',
  },
  {
    email: RACHEL,
    work: [
      { project: 'Team Management', activity: 'Sprint Planning', minutes: 120 },
      { project: 'Team Management', activity: 'Daily Standup', minutes: 120 },
      { project: 'Patient Portal', activity: 'Client Meeting', minutes: 120 },
    ],
    plan: [
      { project: 'Team Management', minutes: 240 },
      { project: 'Patient Portal', minutes: 120 },
    ],
  },
  {
    email: LEO,
    work: [
      { project: 'Patient Portal', activity: 'Frontend', minutes: 300 },
      { project: 'Mobile Banking App', activity: 'Frontend', minutes: 180 },
    ],
    plan: [
      { project: 'Patient Portal', minutes: 300 },
      { project: 'Mobile Banking App', minutes: 180 },
    ],
    absences: [
      {
        type: AbsenceType.VACATION,
        startDate: '2026-10-12',
        endDate: '2026-10-16',
      },
    ],
  },
  {
    email: ZOE,
    work: [
      { project: 'Mobile Banking App', activity: 'Frontend', minutes: 240 },
      { project: 'Mobile Banking App', activity: 'Bug Fixing', minutes: 120 },
      { project: 'Patient Portal', activity: 'Frontend', minutes: 120 },
    ],
    plan: [
      { project: 'Mobile Banking App', minutes: 360 },
      { project: 'Patient Portal', minutes: 120 },
    ],
  },
  {
    email: MAX,
    work: [
      {
        project: 'Mobile Banking App',
        activity: 'Manual Testing',
        minutes: 240,
      },
      { project: 'Patient Portal', activity: 'Manual Testing', minutes: 240 },
    ],
    plan: [
      { project: 'Mobile Banking App', minutes: 240 },
      { project: 'Patient Portal', minutes: 240 },
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
    plan: [{ project: 'Patient Portal', minutes: 480 }],
  },
  {
    email: LILY,
    work: [
      { project: 'Marketing Website', activity: 'Campaign Work', minutes: 300 },
      {
        project: 'Sales Proposals',
        activity: 'Proposal Writing',
        minutes: 120,
      },
      { project: 'Internal Training', activity: 'Training', minutes: 60 },
    ],
    plan: [
      { project: 'Marketing Website', minutes: 300 },
      { project: 'Sales Proposals', minutes: 120 },
    ],
  },
  {
    email: TOBY,
    work: [
      {
        project: 'Marketing Website',
        activity: 'Content Writing',
        minutes: 420,
      },
      { project: 'Internal Training', activity: 'Training', minutes: 60 },
    ],
    plan: [{ project: 'Marketing Website', minutes: 420 }],
  },
  {
    email: FREYA,
    work: [
      {
        project: 'Marketing Website',
        activity: 'Content Writing',
        minutes: 240,
      },
    ],
    plan: [{ project: 'Marketing Website', minutes: 240 }],
  },
  {
    email: OSCAR,
    work: [
      { project: 'Marketing Website', activity: 'UI Design', minutes: 240 },
      {
        project: 'Energy Usage Dashboard',
        activity: 'UI Design',
        minutes: 240,
      },
    ],
    plan: [
      { project: 'Marketing Website', minutes: 240 },
      { project: 'Energy Usage Dashboard', minutes: 240 },
    ],
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

import {
  Activity,
  Building2,
  CircleCheck,
  FolderKanban,
  Tags,
  UserCheck,
  UserPlus,
  UsersRound,
} from "lucide-react";

import { GRACE_DAYS } from "@/lib/utils/reporting-period";

import { Card } from "@/components/ui/card";

import { PageHeader } from "../../shared/PageHeader";
import { SetupStepItem, SetupStepRow } from "./SetupStepRow";
import { TOPIC_TEXT } from "./setup-topics";
import {
  periods,
  planning,
  reports,
  teamTime,
} from "../../layout/sidebar/sidebar-navigation";

const GUIDE_TOPICS: SetupStepItem[] = [
  {
    id: "company",
    title: "Company settings",
    description: TOPIC_TEXT.company,
    icon: Building2,
    completed: false,
    link: { label: "Open Settings", href: "/settings" },
  },
  {
    id: "teams",
    title: "Teams",
    description: TOPIC_TEXT.team,
    icon: UsersRound,
    completed: false,
    link: { label: "Open teams", href: "/admin/teams" },
  },
  {
    id: "categories",
    title: "Categories",
    description: TOPIC_TEXT.category,
    icon: Tags,
    completed: false,
    link: { label: "Open categories", href: "/admin/categories" },
  },
  {
    id: "activities",
    title: "Activities",
    description: TOPIC_TEXT.activity,
    icon: Activity,
    completed: false,
    link: { label: "Open activities", href: "/admin/activities" },
  },
  {
    id: "projects",
    title: "Projects",
    description: `${TOPIC_TEXT.project} ${TOPIC_TEXT.projectPeople}`,
    icon: FolderKanban,
    completed: false,
    link: { label: "Open projects", href: "/admin/projects" },
  },
  {
    id: "people",
    title: "People",
    description:
      "Invite people by email; an employee always joins a team. Put them on projects so they can log time.",
    icon: UserCheck,
    completed: false,
    link: { label: "Open people", href: "/admin/users" },
  },
  {
    id: "managers",
    title: "Managers",
    description: `${TOPIC_TEXT.manager} Invite someone with the Manager role and pick the team they lead, or choose Add a manager on a team once they join. A team has one manager.`,
    icon: UserPlus,
    completed: false,
    link: { label: "Open teams", href: "/admin/teams" },
  },
];

/** What the owner comes back to once the company is set up. */
const DAY_TO_DAY_TOPICS: SetupStepItem[] = [
  {
    id: "team-time",
    title: teamTime.label,
    description:
      "Everyone's week, with the days that have no time. Correct an entry or add an absence for anyone.",
    icon: teamTime.icon,
    completed: false,
    link: { label: "Open Team time", href: teamTime.href },
  },
  {
    id: "planning",
    title: planning.label,
    description: "Plan everyone's month by project, team by team.",
    icon: planning.icon,
    completed: false,
    link: { label: "Open Planning", href: planning.href },
  },
  {
    id: "reports",
    title: reports.label,
    description:
      "Logged hours against expected and planned, what needs attention, and the Excel export.",
    icon: reports.icon,
    completed: false,
    link: { label: "Open Reports", href: reports.href },
  },
  {
    id: "periods",
    title: periods.label,
    description: `Months lock ${GRACE_DAYS} days after they end. Reopen one to correct it, then close it again.`,
    icon: periods.icon,
    completed: false,
    link: { label: "Open Periods", href: periods.href },
  },
];

/** A card of topics, each linking to where it is done. */
export const GuideCard = ({ topics }: { topics: SetupStepItem[] }) => (
  <Card>
    <ul className="divide-y divide-border">
      {topics.map((topic) => (
        <SetupStepRow key={topic.id} step={topic} isCurrent={false} />
      ))}
    </ul>
  </Card>
);

interface SetupGuideProps {
  isRequiredSetupDone: boolean;
}

export const SetupGuide = ({ isRequiredSetupDone }: SetupGuideProps) => (
  <section className="w-full max-w-3xl">
    <PageHeader
      title="How WorkTrack fits together"
      description="Each part links to where you manage it — come back whenever you need a reminder."
    />

    {isRequiredSetupDone && (
      <p className="mb-8 flex items-start gap-2 rounded-lg border border-success/20 bg-success/10 px-3.5 py-2.5 text-sm text-success-text">
        <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Required setup is complete: people on your projects can log time.
        Everything else, such as adding a manager, is optional.
      </p>
    )}

    <GuideCard topics={GUIDE_TOPICS} />

    <h2 className="mt-8 mb-3 text-base font-semibold text-foreground">
      Day to day
    </h2>
    <GuideCard topics={DAY_TO_DAY_TOPICS} />
  </section>
);

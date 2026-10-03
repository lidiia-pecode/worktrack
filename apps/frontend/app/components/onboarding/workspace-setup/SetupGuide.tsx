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

import { Card } from "@/components/ui/card";

import { PageHeader } from "../../shared/PageHeader";
import { SetupStepItem, SetupStepRow } from "./SetupStepRow";
import { TOPIC_TEXT } from "./setup-topics";

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
    link: { label: "Open users", href: "/admin/users" },
  },
  {
    id: "managers",
    title: "Managers",
    description: `${TOPIC_TEXT.manager} Invite someone with the Manager role and pick the team they lead, or make them a team's manager once they join.`,
    icon: UserPlus,
    completed: false,
    link: { label: "Open teams", href: "/admin/teams" },
  },
];

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

    <Card>
      <ul className="divide-y divide-border">
        {GUIDE_TOPICS.map((topic) => (
          <SetupStepRow key={topic.id} step={topic} isCurrent={false} />
        ))}
      </ul>
    </Card>
  </section>
);

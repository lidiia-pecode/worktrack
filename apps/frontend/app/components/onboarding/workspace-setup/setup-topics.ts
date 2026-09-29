/** One explanation per part of WorkTrack, shared by the setup checklist and the guide. */
export const TOPIC_TEXT = {
  company:
    "Time zone, week start and working day decide how days and weeks are counted. Change them under Settings → Company.",
  team: "A team is a group of people whose time one manager reviews. People join one when they are invited.",
  category:
    "Categories group the kinds of work, such as Development or Meetings.",
  activity:
    "Activities are what people log time against, such as Coding or Code review.",
  project:
    "A project is the work time goes to, for a client or internal. People pick from its activities.",
  projectPeople:
    "Only people on a project can log time to it. Add yourself if you log time too.",
  manager: "A manager reviews and corrects their team's time.",
} as const;

import { DataSource } from 'typeorm';

import { Absence } from 'src/absences/entities/absence.entity';
import { AbsencesService } from 'src/absences/absences.service';
import { CapacityService } from 'src/capacity/capacity.service';
import { CompanyStandardDay } from 'src/capacity/entities/company-standard-day.entity';
import { ExpectedHoursService } from 'src/capacity/expected-hours.service';
import { UserCapacity } from 'src/capacity/entities/user-capacity.entity';
import { Company } from 'src/companies/entities/company.entity';
import { Notification } from 'src/notifications/entities/notification.entity';
import { NotificationsService } from 'src/notifications/notifications.service';
import { PlanningEntry } from 'src/planning/entities/planning-entry.entity';
import { PlanningService } from 'src/planning/planning.service';
import { ProjectActivity } from 'src/projects/entities/project-activity.entity';
import { Project } from 'src/projects/entities/project.entity';
import { ReportingPeriod } from 'src/reporting/entities/reporting-period.entity';
import { PeriodLocksService } from 'src/reporting/period-locks.service';
import { ReportingService } from 'src/reporting/reporting.service';
import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { Team } from 'src/teams/entities/team.entity';
import { TeamVisibilityService } from 'src/teams/team-visibility.service';
import { TeamsService } from 'src/teams/teams.service';
import { TimeLog } from 'src/time-logs/entities/time-log.entity';
import { TimeLogsService } from 'src/time-logs/time-logs.service';
import { UserInactivePeriod } from 'src/users/entities/user-inactive-period.entity';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';

/**
 * The services most specs need, wired to one data source as the app wires
 * them. A spec takes the ones it tests and builds by hand only what it stubs.
 */
export const buildServices = (dataSource: DataSource) => {
  const teamVisibility = new TeamVisibilityService(
    dataSource.getRepository(TeamMembership),
    dataSource.getRepository(User),
  );
  const periodLocks = new PeriodLocksService(
    dataSource.getRepository(ReportingPeriod),
  );
  const capacity = new CapacityService(
    dataSource.getRepository(UserCapacity),
    dataSource.getRepository(Company),
    dataSource.getRepository(User),
    dataSource.getRepository(UserInactivePeriod),
    dataSource.getRepository(CompanyStandardDay),
    periodLocks,
  );
  const expectedHours = new ExpectedHoursService(
    dataSource.getRepository(Absence),
    capacity,
  );
  const notifications = new NotificationsService(
    dataSource.getRepository(Notification),
  );
  const reporting = new ReportingService(
    dataSource.getRepository(ReportingPeriod),
    dataSource.getRepository(Company),
    teamVisibility,
    periodLocks,
  );

  return {
    teamVisibility,
    periodLocks,
    capacity,
    expectedHours,
    notifications,
    reporting,
    users: new UsersService(
      dataSource.getRepository(User),
      teamVisibility,
      dataSource,
      capacity,
      periodLocks,
    ),
    teams: new TeamsService(
      dataSource.getRepository(Team),
      teamVisibility,
      dataSource,
      periodLocks,
    ),
    timeLogs: new TimeLogsService(
      dataSource.getRepository(TimeLog),
      dataSource.getRepository(ProjectActivity),
      periodLocks,
      teamVisibility,
      expectedHours,
      capacity,
      dataSource,
    ),
    absences: new AbsencesService(
      dataSource.getRepository(Absence),
      periodLocks,
      teamVisibility,
      capacity,
      notifications,
      dataSource,
    ),
    planning: new PlanningService(
      dataSource.getRepository(PlanningEntry),
      dataSource.getRepository(Project),
      teamVisibility,
      periodLocks,
      expectedHours,
      capacity,
      dataSource,
    ),
  };
};

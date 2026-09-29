import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, MoreThan, Repository } from 'typeorm';

import { Team } from 'src/teams/entities/team.entity';
import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { User } from 'src/users/entities/user.entity';
import { Invitation } from 'src/invitations/entities/invitation.entity';
import { Activity } from 'src/activities/entities/activity.entity';
import { ActCategory } from 'src/activity-categories/entities/activities-category.entity';
import { Project } from 'src/projects/entities/project.entity';

import { InvitationStatus } from 'src/invitations/enums/invitation-status.enum';
import { UserRole, UserStatus } from 'src/users/enums/user-role.enum';
import { TeamRole } from 'src/teams/enums/team-role.enum';
import { TeamStatus } from 'src/teams/enums/team-status.enum';
import { ActivityStatus } from 'src/activities/enums/activity-status.enum';
import { ActCategoryStatus } from 'src/activity-categories/enums/category-status.enum';
import { ProjectStatus } from 'src/projects/enums/project-status.enum';

import {
  OwnerSetupStateDto,
  OwnerSetupStepStateDto,
} from './dtos/owner-setup-state.dto';

import {
  ManagerSetupStateDto,
  ManagerSetupStepStateDto,
} from './dtos/manager-setup-state.dto';

@Injectable()
export class OnboardingService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,

    @InjectRepository(TeamMembership)
    private readonly membershipRepo: Repository<TeamMembership>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Invitation)
    private readonly invitationRepo: Repository<Invitation>,

    @InjectRepository(Activity)
    private readonly activityRepo: Repository<Activity>,

    @InjectRepository(ActCategory)
    private readonly categoryRepo: Repository<ActCategory>,

    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  // ===========================================================================
  // OWNER
  // ===========================================================================

  async getOwnerSetupState(companyId: string): Promise<OwnerSetupStateDto> {
    const [
      createTeam,
      createCategory,
      createActivity,
      projectWithActivitiesId,
      projectWithPeopleId,
      firstProjectId,
      managerJoined,
      managerInvited,
      assignManager,
    ] = await Promise.all([
      this.hasActiveTeam(companyId),
      this.hasActiveCategory(companyId),
      this.hasActiveActivity(companyId),
      this.findProjectReadyForTime(companyId, { withPeople: false }),
      this.findProjectReadyForTime(companyId, { withPeople: true }),
      this.findFirstActiveProject(companyId),
      this.hasActiveManagerUser(companyId),
      this.hasPendingManagerInvitation(companyId),
      this.hasManagerAssignedToTeam(companyId),
    ]);

    const steps: OwnerSetupStepStateDto = {
      createTeam,
      createCategory,
      createActivity,
      addProjectActivities: projectWithActivitiesId !== null,
      addProjectPeople: projectWithPeopleId !== null,
    };

    return {
      role: 'OWNER',
      steps,
      managerSteps: {
        inviteManager: managerInvited || managerJoined,
        managerJoined,
        assignManager,
      },
      setupProjectId: projectWithActivitiesId ?? firstProjectId,
      setupComplete: Object.values(steps).every(Boolean),
    };
  }

  // ===========================================================================
  // MANAGER
  // ===========================================================================

  async getManagerSetupState(
    companyId: string,
    userId: string,
  ): Promise<ManagerSetupStateDto> {
    const teamIds = await this.getManagerActiveTeamIds(companyId, userId);

    const teamAssigned = teamIds.length > 0;

    if (!teamAssigned) {
      return {
        role: 'MANAGER',
        steps: {
          teamAssigned: false,
          inviteMember: false,
          memberJoined: false,
          addTeamMember: false,
          createProject: false,
          createActivity: false,
          createCategory: false,
        },
        setupComplete: false,
      };
    }

    const [
      inviteMember,
      memberJoined,
      addTeamMember,
      createCategory,
      createActivity,
      createProject,
    ] = await Promise.all([
      this.hasPendingOrAcceptedEmployeeInvitation(companyId),
      this.hasActiveEmployeeInTeams(companyId, teamIds),
      this.hasTeamMember(companyId, teamIds),
      this.hasActiveActivity(companyId),
      this.hasActiveCategory(companyId),
      this.hasActiveProject(companyId),
    ]);

    const steps: ManagerSetupStepStateDto = {
      teamAssigned,
      inviteMember,
      memberJoined,
      addTeamMember,
      createCategory,
      createActivity,
      createProject,
    };

    return {
      role: 'MANAGER',
      steps,
      setupComplete: Object.values(steps).every(Boolean),
    };
  }

  // ===========================================================================
  // TEAM
  // ===========================================================================

  private async hasActiveTeam(companyId: string): Promise<boolean> {
    return this.teamRepo.exists({
      where: {
        companyId,
        status: TeamStatus.ACTIVE,
      },
    });
  }

  private async getManagerActiveTeamIds(
    companyId: string,
    userId: string,
  ): Promise<string[]> {
    const memberships = await this.membershipRepo.find({
      where: {
        companyId,
        userId,
        leftAt: IsNull(),
        roleInTeam: TeamRole.MANAGER,
        team: {
          companyId,
          status: TeamStatus.ACTIVE,
        },
        user: {
          companyId,
          role: UserRole.MANAGER,
          status: UserStatus.ACTIVE,
        },
      },
      select: {
        teamId: true,
      },
    });

    return memberships.map(({ teamId }) => teamId);
  }

  private async hasManagerAssignedToTeam(companyId: string): Promise<boolean> {
    return this.membershipRepo.exists({
      where: {
        companyId,
        leftAt: IsNull(),
        roleInTeam: TeamRole.MANAGER,
        team: {
          companyId,
          status: TeamStatus.ACTIVE,
        },
        user: {
          companyId,
          role: UserRole.MANAGER,
          status: UserStatus.ACTIVE,
        },
      },
    });
  }

  private async hasTeamMember(
    companyId: string,
    teamIds: string[],
  ): Promise<boolean> {
    if (teamIds.length === 0) {
      return false;
    }

    return this.membershipRepo
      .createQueryBuilder('membership')
      .where('membership.companyId = :companyId', { companyId })
      .andWhere('membership.teamId IN (:...teamIds)', { teamIds })
      .andWhere('membership.leftAt IS NULL')
      .andWhere('membership.roleInTeam = :role', { role: TeamRole.MEMBER })
      .getExists();
  }

  // ===========================================================================
  // OWNER — MANAGER
  // ===========================================================================

  private async hasActiveManagerUser(companyId: string): Promise<boolean> {
    return this.userRepo.exists({
      where: {
        companyId,
        role: UserRole.MANAGER,
        status: UserStatus.ACTIVE,
      },
    });
  }

  private async hasPendingManagerInvitation(
    companyId: string,
  ): Promise<boolean> {
    return this.invitationRepo.exists({
      where: {
        companyId,
        role: UserRole.MANAGER,
        status: InvitationStatus.PENDING,
        expiresAt: MoreThan(new Date()),
      },
    });
  }

  // ===========================================================================
  // MANAGER — INVITATIONS
  // ===========================================================================

  private async hasPendingOrAcceptedEmployeeInvitation(
    companyId: string,
  ): Promise<boolean> {
    return this.invitationRepo.exists({
      where: [
        {
          companyId,
          role: UserRole.EMPLOYEE,
          status: InvitationStatus.PENDING,
          expiresAt: MoreThan(new Date()),
        },
        {
          companyId,
          role: UserRole.EMPLOYEE,
          status: InvitationStatus.ACCEPTED,
        },
      ],
    });
  }

  // ===========================================================================
  // MANAGER — EMPLOYEES
  // ===========================================================================

  /** Only the manager's own teams count: people outside them are not theirs to see. */
  private async hasActiveEmployeeInTeams(
    companyId: string,
    teamIds: string[],
  ): Promise<boolean> {
    return this.membershipRepo.exists({
      where: {
        companyId,
        teamId: In(teamIds),
        leftAt: IsNull(),
        user: {
          companyId,
          role: UserRole.EMPLOYEE,
          status: UserStatus.ACTIVE,
        },
      },
    });
  }

  // ===========================================================================
  // ACTIVITIES
  // ===========================================================================

  private async hasActiveActivity(companyId: string): Promise<boolean> {
    return this.activityRepo.exists({
      where: {
        companyId,
        status: ActivityStatus.ACTIVE,
      },
    });
  }

  // ===========================================================================
  // CATEGORIES
  // ===========================================================================

  private async hasActiveCategory(companyId: string): Promise<boolean> {
    return this.categoryRepo.exists({
      where: {
        companyId,
        status: ActCategoryStatus.ACTIVE,
      },
    });
  }

  // ===========================================================================
  // OWNER — PROJECTS
  // ===========================================================================

  /** A project somebody can log time on: it has activities, and people when asked. */
  private async findProjectReadyForTime(
    companyId: string,
    { withPeople }: { withPeople: boolean },
  ): Promise<string | null> {
    const query = this.projectRepo
      .createQueryBuilder('project')
      .select('project.id', 'id')
      .innerJoin(
        'project.projectActivities',
        'projectActivity',
        'projectActivity.isActive = true',
      )
      .innerJoin(
        'projectActivity.activity',
        'activity',
        'activity.status = :activityStatus',
        { activityStatus: ActivityStatus.ACTIVE },
      )
      .where('project.companyId = :companyId', { companyId })
      .andWhere('project.status = :projectStatus', {
        projectStatus: ProjectStatus.ACTIVE,
      });

    if (withPeople) {
      query.innerJoin('project.users', 'user', 'user.status = :userStatus', {
        userStatus: UserStatus.ACTIVE,
      });
    }

    const project = await query
      .orderBy('project.createdAt', 'ASC')
      .limit(1)
      .getRawOne<{ id: string }>();

    return project?.id ?? null;
  }

  private async findFirstActiveProject(
    companyId: string,
  ): Promise<string | null> {
    const project = await this.projectRepo.findOne({
      where: { companyId, status: ProjectStatus.ACTIVE },
      order: { createdAt: 'ASC' },
      select: { id: true },
    });

    return project?.id ?? null;
  }

  // ===========================================================================
  // PROJECTS
  // ===========================================================================

  private async hasActiveProject(companyId: string): Promise<boolean> {
    return this.projectRepo.exists({
      where: {
        companyId,
        status: ProjectStatus.ACTIVE,
      },
    });
  }
}

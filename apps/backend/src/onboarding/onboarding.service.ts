import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';

import { Company } from 'src/companies/entities/company.entity';
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

    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

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
      setupFinished: await this.finishIfDone(
        companyId,
        Object.values(steps).every(Boolean),
      ),
    };
  }

  /** The owner leaves the guide for good; it does not come back by itself. */
  async skipOwnerSetup(companyId: string): Promise<OwnerSetupStateDto> {
    await this.markSetupFinished(companyId);

    return this.getOwnerSetupState(companyId);
  }

  // ===========================================================================
  // SETUP FINISHED
  // ===========================================================================

  /**
   * Setup counts as finished once it has been completed or skipped, so a team
   * or project archived later never reopens the guide.
   */
  private async finishIfDone(
    companyId: string,
    stepsDone: boolean,
  ): Promise<boolean> {
    const company = await this.companyRepo.findOneOrFail({
      where: { id: companyId },
      select: { id: true, setupFinishedAt: true },
    });

    if (company.setupFinishedAt) return true;
    if (!stepsDone) return false;

    await this.markSetupFinished(companyId);
    return true;
  }

  private async markSetupFinished(companyId: string): Promise<void> {
    await this.companyRepo.update(
      { id: companyId, setupFinishedAt: IsNull() },
      { setupFinishedAt: new Date() },
    );
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

  // ===========================================================================
  // MANAGER
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
  // PROJECTS
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
}

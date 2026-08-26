import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';

import { Team } from 'src/teams/entities/team.entity';
import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { User } from 'src/users/entities/user.entity';
import { Invitation } from 'src/invitations/entities/invitation.entity';
import { InvitationStatus } from 'src/invitations/enums/invitation-status.enum';
import { UserRole, UserStatus } from 'src/users/enums/UserRole.enum';
import { TeamRole } from 'src/teams/enums/team-role.enum';
import { TeamStatus } from 'src/teams/enums/team-status.enum';

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
  ) {}

  async getOwnerSetupState(companyId: string): Promise<OwnerSetupStateDto> {
    const [
      hasActiveTeam,
      hasManagerUser,
      hasPendingManagerInvitation,
      hasManagerAssignedToTeam,
    ] = await Promise.all([
      this.hasActiveTeam(companyId),
      this.hasActiveManagerUser(companyId),
      this.hasPendingManagerInvitation(companyId),
      this.hasManagerAssignedToActiveTeam(companyId),
    ]);

    const steps: OwnerSetupStepStateDto = {
      createTeam: hasActiveTeam,
      inviteManager: hasPendingManagerInvitation || hasManagerUser,
      managerJoined: hasManagerUser,
      assignManager: hasManagerAssignedToTeam,
    };

    return {
      role: 'OWNER',
      steps,
      setupComplete: Object.values(steps).every(Boolean),
    };
  }

  private async hasActiveTeam(companyId: string): Promise<boolean> {
    const count = await this.teamRepo.count({
      where: {
        companyId,
        status: TeamStatus.ACTIVE,
      },
      take: 1,
    });

    return count > 0;
  }

  private async hasActiveManagerUser(companyId: string): Promise<boolean> {
    const count = await this.userRepo.count({
      where: {
        companyId,
        role: UserRole.MANAGER,
        status: UserStatus.ACTIVE,
      },
      take: 1,
    });

    return count > 0;
  }

  private async hasPendingManagerInvitation(
    companyId: string,
  ): Promise<boolean> {
    const count = await this.invitationRepo.count({
      where: {
        companyId,
        role: UserRole.MANAGER,
        status: InvitationStatus.PENDING,
        expiresAt: MoreThan(new Date()),
      },
      take: 1,
    });

    return count > 0;
  }

  private async hasManagerAssignedToActiveTeam(
    companyId: string,
  ): Promise<boolean> {
    const count = await this.membershipRepo.count({
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
      take: 1,
    });

    return count > 0;
  }
}

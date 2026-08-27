import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Team } from 'src/teams/entities/team.entity';
import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { User } from 'src/users/entities/user.entity';
import { Invitation } from 'src/invitations/entities/invitation.entity';

import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { Activity } from 'src/activities/entities/activity.entity';
import { ActCategory } from 'src/activity-categories/entities/activities-category.entity';
import { Project } from 'src/projects/entities/project.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Team,
      TeamMembership,
      User,
      Invitation,
      Activity,
      ActCategory,
      Project,
    ]),
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}

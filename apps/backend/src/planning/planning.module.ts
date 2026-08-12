import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';
import { PlanningEntry } from './entities/planning-entry.entity';
import { ProjectActivity } from 'src/projects/entities/project-activity.entity';
import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { User } from 'src/users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlanningEntry,
      ProjectActivity,
      TeamMembership,
      User,
    ]),
  ],
  controllers: [PlanningController],
  providers: [PlanningService],
  exports: [PlanningService],
})
export class PlanningModule {}

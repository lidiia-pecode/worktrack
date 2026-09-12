import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';
import { PlanningEntry } from './entities/planning-entry.entity';
import { ProjectActivity } from 'src/projects/entities/project-activity.entity';
import { User } from 'src/users/entities/user.entity';
import { TeamsModule } from 'src/teams/teams.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlanningEntry, ProjectActivity, User]),
    TeamsModule,
  ],
  controllers: [PlanningController],
  providers: [PlanningService],
  exports: [PlanningService],
})
export class PlanningModule {}

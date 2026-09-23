import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';
import { PlanningEntry } from './entities/planning-entry.entity';
import { Project } from 'src/projects/entities/project.entity';
import { User } from 'src/users/entities/user.entity';
import { Company } from 'src/companies/entities/company.entity';
import { TeamsModule } from 'src/teams/teams.module';
import { ReportingModule } from 'src/reporting/reporting.module';
import { CapacityModule } from 'src/capacity/capacity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlanningEntry, Project, User, Company]),
    TeamsModule,
    ReportingModule,
    CapacityModule,
  ],
  controllers: [PlanningController],
  providers: [PlanningService],
  exports: [PlanningService],
})
export class PlanningModule {}

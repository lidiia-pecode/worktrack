import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CapacityModule } from 'src/capacity/capacity.module';
import { TeamMembership } from 'src/teams/entities/team-membership.entity';
import { TeamsModule } from 'src/teams/teams.module';
import { TimeLog } from 'src/time-logs/entities/time-log.entity';
import { Company } from 'src/companies/entities/company.entity';

import { ReportingModule } from '../reporting.module';
import { PeopleReportController } from './people-report.controller';
import { PeopleReportService } from './people-report.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TimeLog, Company, TeamMembership]),
    ReportingModule,
    CapacityModule,
    TeamsModule,
  ],
  controllers: [PeopleReportController],
  providers: [PeopleReportService],
})
export class PeopleReportModule {}

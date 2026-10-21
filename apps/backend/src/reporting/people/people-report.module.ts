import { Module } from '@nestjs/common';

import { CapacityModule } from 'src/capacity/capacity.module';
import { TeamsModule } from 'src/teams/teams.module';

import { ReportingModule } from '../reporting.module';
import { PeopleReportController } from './people-report.controller';
import { PeopleReportService } from './people-report.service';

@Module({
  imports: [ReportingModule, CapacityModule, TeamsModule],
  controllers: [PeopleReportController],
  providers: [PeopleReportService],
})
export class PeopleReportModule {}

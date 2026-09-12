import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ReportingPeriod } from './entities/reporting-period.entity';
import { ReportingService } from './reporting.service';
import { ReportingController } from './reporting.controller';
import { TeamsModule } from 'src/teams/teams.module';

@Module({
  imports: [TypeOrmModule.forFeature([ReportingPeriod]), TeamsModule],
  controllers: [ReportingController],
  providers: [ReportingService],
  exports: [ReportingService],
})
export class ReportingModule {}

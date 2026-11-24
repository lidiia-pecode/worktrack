import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ReportingPeriod } from './entities/reporting-period.entity';
import { PeriodLocksService } from './period-locks.service';

@Module({
  imports: [TypeOrmModule.forFeature([ReportingPeriod])],
  providers: [PeriodLocksService],
  exports: [PeriodLocksService],
})
export class PeriodLocksModule {}

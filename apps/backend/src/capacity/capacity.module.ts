import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Absence } from 'src/absences/entities/absence.entity';
import { Company } from 'src/companies/entities/company.entity';
import { User } from 'src/users/entities/user.entity';
import { UserInactivePeriod } from 'src/users/entities/user-inactive-period.entity';
import { PeriodLocksModule } from 'src/reporting/period-locks.module';

import { UserCapacity } from './entities/user-capacity.entity';
import { CompanyStandardDay } from './entities/company-standard-day.entity';
import { CapacityService } from './capacity.service';
import { CapacityController } from './capacity.controller';
import { ExpectedHoursService } from './expected-hours.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserCapacity,
      CompanyStandardDay,
      Company,
      Absence,
      User,
      UserInactivePeriod,
    ]),
    PeriodLocksModule,
  ],
  controllers: [CapacityController],
  providers: [CapacityService, ExpectedHoursService],
  exports: [CapacityService, ExpectedHoursService],
})
export class CapacityModule {}

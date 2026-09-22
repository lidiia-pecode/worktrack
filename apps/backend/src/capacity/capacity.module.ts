import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Absence } from 'src/absences/entities/absence.entity';
import { Company } from 'src/companies/entities/company.entity';

import { UserCapacity } from './entities/user-capacity.entity';
import { CapacityService } from './capacity.service';
import { ExpectedHoursService } from './expected-hours.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserCapacity, Company, Absence])],
  providers: [CapacityService, ExpectedHoursService],
  exports: [CapacityService, ExpectedHoursService],
})
export class CapacityModule {}

import { Module } from '@nestjs/common';

import { CapacityModule } from 'src/capacity/capacity.module';
import { TeamsModule } from 'src/teams/teams.module';

import { ReportingModule } from '../reporting.module';
import { UtilisationController } from './utilisation.controller';
import { UtilisationService } from './utilisation.service';

@Module({
  imports: [ReportingModule, CapacityModule, TeamsModule],
  controllers: [UtilisationController],
  providers: [UtilisationService],
})
export class UtilisationModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Absence } from './entities/absence.entity';
import { AbsencesService } from './absences.service';
import { AbsencesController } from './absences.controller';
import { ReportingModule } from 'src/reporting/reporting.module';
import { TeamsModule } from 'src/teams/teams.module';
import { CapacityModule } from 'src/capacity/capacity.module';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Absence]),
    ReportingModule,
    TeamsModule,
    CapacityModule,
    NotificationsModule,
  ],
  controllers: [AbsencesController],
  providers: [AbsencesService],
  exports: [AbsencesService],
})
export class AbsencesModule {}

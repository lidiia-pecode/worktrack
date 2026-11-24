import { Module } from '@nestjs/common';
import { TimeLogsController } from './time-logs.controller';
import { TimeLogsService } from './time-logs.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeLog } from './entities/time-log.entity';
import { ProjectActivity } from 'src/projects/entities/project-activity.entity';
import { User } from 'src/users/entities/user.entity';
import { PeriodLocksModule } from 'src/reporting/period-locks.module';
import { TeamsModule } from 'src/teams/teams.module';
import { CapacityModule } from 'src/capacity/capacity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TimeLog, ProjectActivity, User]),
    PeriodLocksModule,
    TeamsModule,
    CapacityModule,
  ],
  controllers: [TimeLogsController],
  providers: [TimeLogsService],
  exports: [TimeLogsService],
})
export class TimeLogsModule {}

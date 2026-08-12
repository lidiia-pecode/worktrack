import { Module } from '@nestjs/common';
import { TimeLogsController } from './time-logs.controller';
import { TimeLogsService } from './time-logs.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeLog } from './entities/time-log.entity';
import { ProjectActivity } from 'src/projects/entities/project-activity.entity';
import { User } from 'src/users/entities/user.entity';
import { ReportingModule } from 'src/reporting/reporting.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TimeLog, ProjectActivity, User]),
    ReportingModule,
  ],
  controllers: [TimeLogsController],
  providers: [TimeLogsService],
  exports: [TimeLogsService],
})
export class TimeLogsModule {}

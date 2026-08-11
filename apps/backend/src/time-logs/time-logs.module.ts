import { Module } from '@nestjs/common';
import { TimeLogsController } from './time-logs.controller';
import { TimeLogsService } from './time-logs.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeLog } from './entities/time-log.entity';
import { ProjectActivity } from 'src/projects/entities/project-activity.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TimeLog, ProjectActivity])],
  controllers: [TimeLogsController],
  providers: [TimeLogsService],
})
export class TimeLogsModule {}

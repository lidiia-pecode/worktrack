import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';
import { PlanningEntry } from './entities/planning-entry.entity';
import { TimeLog } from 'src/time-logs/entities/time-log.entity';
import { ProjectsModule } from 'src/projects/projects.module';

@Module({
  imports: [TypeOrmModule.forFeature([PlanningEntry, TimeLog]), ProjectsModule],
  controllers: [PlanningController],
  providers: [PlanningService],
  exports: [PlanningService],
})
export class PlanningModule {}

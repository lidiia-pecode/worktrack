import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Activity } from './entities/activity.entity';
import { ActivitiesService } from './activities.service';
import { ActivitiesController } from './activities.controller';
import { ActCategoriesModule } from 'src/activity-categories/activity-categories.module';
import { UsersModule } from 'src/users/users.module';
import { ProjectActivity } from 'src/projects/entities/project-activity.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Activity, ProjectActivity]),
    ActCategoriesModule,
    UsersModule,
  ],
  controllers: [ActivitiesController],
  providers: [ActivitiesService],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}

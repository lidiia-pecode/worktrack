import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { Project } from './entities/project.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectActivity } from './entities/project-activity.entity';
import { User } from 'src/users/entities/user.entity';
import { UsersModule } from 'src/users/users.module';
import { ActivitiesModule } from 'src/activities/activities.module';
import { TeamsModule } from 'src/teams/teams.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectActivity, User]),
    UsersModule,
    ActivitiesModule,
    TeamsModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}

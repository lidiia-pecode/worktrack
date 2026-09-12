import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from './entities/team.entity';
import { TeamMembership } from './entities/team-membership.entity';
import { User } from 'src/users/entities/user.entity';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { TeamVisibilityService } from './team-visibility.service';

@Module({
  imports: [TypeOrmModule.forFeature([Team, TeamMembership, User])],
  controllers: [TeamsController],
  providers: [TeamsService, TeamVisibilityService],
  exports: [TeamsService, TeamVisibilityService],
})
export class TeamsModule {}

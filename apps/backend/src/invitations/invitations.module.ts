import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersModule } from 'src/users/users.module';
import { AuthModule } from 'src/auth/auth.module';
import { MailModule } from 'src/mail/mail.module';
import { TeamsModule } from 'src/teams/teams.module';
import { Team } from 'src/teams/entities/team.entity';

import { Invitation } from './entities/invitation.entity';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invitation, Team]),
    UsersModule,
    AuthModule,
    MailModule,
    TeamsModule,
  ],

  controllers: [InvitationsController],

  providers: [InvitationsService],

  exports: [InvitationsService],
})
export class InvitationsModule {}

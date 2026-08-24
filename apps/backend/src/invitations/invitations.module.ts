import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersModule } from 'src/users/users.module';
import { AuthModule } from 'src/auth/auth.module';
import { MailModule } from 'src/mail/mail.module';

import { Invitation } from './entities/invitation.entity';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations-service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invitation]),
    UsersModule,
    AuthModule,
    MailModule,
  ],

  controllers: [InvitationsController],

  providers: [InvitationsService],

  exports: [InvitationsService],
})
export class InvitationsModule {}

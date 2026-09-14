import { Module } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { UsersModule } from './users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsModule } from './projects/projects.module';
import { TimeLogsModule } from './time-logs/time-logs.module';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { ActivitiesModule } from './activities/activities.module';
import { ActCategoriesModule } from './activity-categories/activity-categories.module';
import { PlanningModule } from './planning/planning.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation';
import { databaseConnectionOptions } from './config/database.options';
import { ScheduleModule } from '@nestjs/schedule';
import { CompaniesModule } from './companies/companies.module';
import { TeamsModule } from './teams/teams.module';
import authConfig from './config/auth.config';
import mailConfig from './config/mail.config';
import { InvitationsModule } from './invitations/invitations.module';
import { OnboardingModule } from './onboarding/onboarding.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [authConfig, mailConfig],
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 100,
      },
    ]),

    ScheduleModule.forRoot(),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ...databaseConnectionOptions((key) => config.get<string>(key)),
        autoLoadEntities: true,
      }),
    }),
    UsersModule,
    ProjectsModule,
    TimeLogsModule,
    AuthModule,
    ActivitiesModule,
    ActCategoriesModule,
    PlanningModule,
    CompaniesModule,
    TeamsModule,
    InvitationsModule,
    OnboardingModule,
  ],

  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

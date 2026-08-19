import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from 'src/users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { PasswordService } from './services/password.service';
import { SessionService } from './services/session.service';
import { TokenService } from './services/token.service';
import { CookieService } from './services/cookie.service';
import { AuthSession } from './entities/auth-session.entity';
import { LocalStrategy } from './auth-strategies/local';
import { AccessStrategy } from './auth-strategies/access';
import { RefreshStrategy } from './auth-strategies/refresh';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SessionCleanupService } from './services/session-cleanup.service';
import { CompaniesModule } from 'src/companies/companies.module';
import {
  GoogleLinkStrategy,
  GoogleLoginStrategy,
  GoogleSignupStrategy,
} from './auth-strategies/google';
import { GoogleSignupToken } from './entities/google-signup-token.entity';
import { GoogleLinkToken } from './entities/google-link-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { AuthPolicyService } from './services/auth-policy.service';
import { GoogleAuthService } from './services/google-auth.service';
import { PasswordResetService } from './services/password-reset.service';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuthSession,
      GoogleSignupToken,
      GoogleLinkToken,
      PasswordResetToken,
    ]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => ({}),
    }),
    UsersModule,
    CompaniesModule,
    MailModule,
  ],
  controllers: [AuthController],
  providers: [
    SessionCleanupService,
    AuthService,
    PasswordService,
    SessionService,
    TokenService,
    CookieService,
    AuthPolicyService,
    GoogleAuthService,
    PasswordResetService,
    LocalStrategy,
    AccessStrategy,
    RefreshStrategy,
    GoogleSignupStrategy,
    GoogleLoginStrategy,
    GoogleLinkStrategy,
  ],
  exports: [
    AuthService,
    PasswordService,
    SessionService,
    TokenService,
    CookieService,
  ],
})
export class AuthModule {}

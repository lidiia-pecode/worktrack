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
import { GoogleStrategy } from './auth-strategies/google';
import { AccessStrategy } from './auth-strategies/access';
import { RefreshStrategy } from './auth-strategies/refresh';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SessionCleanupService } from './services/session-cleanup.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuthSession]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => ({}),
    }),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [
    SessionCleanupService,
    AuthService,
    PasswordService,
    SessionService,
    TokenService,
    CookieService,
    LocalStrategy,
    AccessStrategy,
    RefreshStrategy,
    GoogleStrategy,
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

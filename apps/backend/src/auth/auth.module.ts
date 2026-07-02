import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { JwtService } from './services';
import { User } from 'src/users/entities/user.entity';
import { AuthSession } from './entities/AuthSession.entity';
import { AccessStrategy } from './auth-strategies/access';
import { RefreshStrategy } from './auth-strategies/refresh';
import { LocalStrategy } from './auth-strategies/local';
import { GoogleStrategy } from './auth-strategies/google';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([User, AuthSession]),
    JwtModule.register({
      global: true,
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtService,
    AccessStrategy,
    RefreshStrategy,
    LocalStrategy,
    GoogleStrategy,
  ],
  exports: [JwtService],
})
export class AuthModule {}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { cookieExtractor } from '../helpers/cookies-extractor';
import { AuthContext, JwtRefreshPayload } from './types';
import { UsersService } from 'src/users/users.service';
import { UserStatus } from 'src/users/entities/user.entity';
import { SessionService } from '../services';

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionService: SessionService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor('refresh_token'),
      ]),
      secretOrKey: configService.getOrThrow('REFRESH_TOKEN_SECRET'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtRefreshPayload): Promise<AuthContext> {
    if (!payload.sessionId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const sessionExists = await this.sessionService.exists(payload.sessionId);
    if (!sessionExists) {
      throw new UnauthorizedException('Session has been revoked or expired');
    }

    const user = await this.usersService.findUserById(payload.id);

    if (!user) {
      throw new UnauthorizedException();
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException();
    }

    if (user.companyId !== payload.companyId) {
      throw new UnauthorizedException();
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        companyId: user.companyId,
        role: user.role,
      },
      sessionId: payload.sessionId,
    };
  }
}

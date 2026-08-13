import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { cookieExtractor } from '../helpers/cookies-extractor';
import { AuthContext, JwtAccessPayload } from './types';
import { UsersService } from 'src/users/users.service';
import { SessionService } from '../services';
import { UserStatus } from 'src/users/enums/UserRole.enum';
import { CompanyStatus } from 'src/companies/enum/company-status.enum';

@Injectable()
export class AccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionService: SessionService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor('access_token'),
      ]),
      secretOrKey: configService.getOrThrow('ACCESS_TOKEN_SECRET'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtAccessPayload): Promise<AuthContext> {
    if (!payload.sessionId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const sessionExists = await this.sessionService.exists(payload.sessionId);
    if (!sessionExists) {
      throw new UnauthorizedException('Session has been revoked or expired');
    }

    const user = await this.usersService.findUserByIdWithCompany(payload.id);

    if (!user) {
      throw new UnauthorizedException();
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException();
    }

    if (user.companyId !== payload.companyId) {
      throw new UnauthorizedException();
    }

    if (user.company?.status === CompanyStatus.SUSPENDED) {
      throw new UnauthorizedException(
        'Company account is suspended. Please contact billing.',
      );
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

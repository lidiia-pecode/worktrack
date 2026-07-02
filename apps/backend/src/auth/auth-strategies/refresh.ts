import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { UUID } from 'crypto';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from 'src/users/users.service';
import { cookieExtractor } from '../helpers/cookies-extractor';
import { AuthContext } from './types';

type RefreshPayload = { sessionId: UUID; userId: string };

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor('refresh_token'),
      ]),
      secretOrKey: process.env.REFRESH_TOKEN_SECRET!,
      ignoreExpiration: false,
      passReqToCallback: false,
    });
  }

  async validate({ userId, sessionId }: RefreshPayload): Promise<AuthContext> {
    const user = await this.usersService.findUserById(userId);

    if (!user) {
      throw new UnauthorizedException();
    }

    return { user, sessionId };
  }
}

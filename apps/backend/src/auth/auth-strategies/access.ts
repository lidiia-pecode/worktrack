import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AuthContext } from './types';
import { User } from 'src/users/entities/user.entity';
import { UUID } from 'crypto';
import { UsersService } from 'src/users/users.service';
import { cookieExtractor } from '../helpers/cookies-extractor';

type AccessPayload = Pick<User, 'id' | 'email'> & { sessionId: UUID };

@Injectable()
export class AccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor('access_token'),
      ]),
      secretOrKey: process.env.ACCESS_TOKEN_SECRET!,
      ignoreExpiration: false,
      passReqToCallback: false,
    });
  }

  async validate({
    id,
    email,
    sessionId,
  }: AccessPayload): Promise<AuthContext> {
    const user = await this.usersService.findUserById(id);

    if (!user || user.email !== email) {
      throw new UnauthorizedException();
    }

    return { user, sessionId };
  }
}

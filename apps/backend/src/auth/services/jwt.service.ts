import { Injectable } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { UUID } from 'node:crypto';
type JwtPayload = {
  id: string;
  email: string;
  sessionId: UUID;
};

@Injectable()
export class JwtService {
  constructor(private _jwtService: NestJwtService) {}

  signAccess({ id, email, sessionId }: JwtPayload) {
    return this._jwtService.sign(
      { id, email, sessionId },
      {
        secret: process.env.ACCESS_TOKEN_SECRET,
        expiresIn: '1m',
      },
    );
  }

  verifyAccess(token: string) {
    return this._jwtService.verify<JwtPayload>(token, {
      secret: process.env.ACCESS_TOKEN_SECRET,
    });
  }

  signRefresh({ id, email, sessionId }: JwtPayload) {
    return this._jwtService.sign(
      { id, email, sessionId },
      {
        secret: process.env.REFRESH_TOKEN_SECRET,
        expiresIn: '30d',
      },
    );
  }

  verifyRefresh(token: string) {
    return this._jwtService.verify<JwtPayload>(token, {
      secret: process.env.REFRESH_TOKEN_SECRET,
    });
  }
}

//apps/backend/src/auth/auth-strategies/google.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
import { User } from 'src/users/entities/user.entity';
import { AuthService } from '../services';
import { GoogleUserPayload } from '../dtos/auth.dto';
import { AuthUser } from './types';
import { CookieStateStore } from './cookie-state-store';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    super({
      clientID: configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
      store: new CookieStateStore(),
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const googleUser: GoogleUserPayload = {
      email: profile.emails?.[0]?.value ?? '',
      firstName: profile.name?.givenName ?? '',
      lastName: profile.name?.familyName ?? '',
      googleId: profile.id,
    };

    try {
      const user: User = await this.authService.validateGoogleUser(googleUser);
      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        companyId: user.companyId,
        role: user.role,
      };

      done(null, authUser);
    } catch (err) {
      done(err, false);
    }
  }
}

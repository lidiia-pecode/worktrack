//apps/backend/src/auth/auth-strategies/google.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
import { CookieStateStore } from './cookie-state-store';

function getGoogleStrategyOptions(
  configService: ConfigService,
  callbackURL: string,
) {
  return {
    clientID: configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
    clientSecret: configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
    callbackURL,
    scope: ['email', 'profile'],
    state: true,
    store: new CookieStateStore(),
  };
}

function getGooglePayload(profile: Profile) {
  return {
    email: profile.emails?.[0]?.value ?? '',
    firstName: profile.name?.givenName ?? '',
    lastName: profile.name?.familyName ?? '',
    googleId: profile.id,
  };
}

@Injectable()
export class GoogleLoginStrategy extends PassportStrategy(
  Strategy,
  'google-login',
) {
  constructor(configService: ConfigService) {
    super(
      getGoogleStrategyOptions(
        configService,
        configService.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      ),
    );
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    try {
      done(null, getGooglePayload(profile));
    } catch (error) {
      done(error, false);
    }
  }
}

@Injectable()
export class GoogleSignupStrategy extends PassportStrategy(
  Strategy,
  'google-signup',
) {
  constructor(configService: ConfigService) {
    super(
      getGoogleStrategyOptions(
        configService,
        configService.getOrThrow<string>('GOOGLE_SIGNUP_CALLBACK_URL'),
      ),
    );
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    try {
      done(null, getGooglePayload(profile));
    } catch (error) {
      done(error, false);
    }
  }
}

@Injectable()
export class GoogleLinkStrategy extends PassportStrategy(
  Strategy,
  'google-link',
) {
  constructor(configService: ConfigService) {
    super(
      getGoogleStrategyOptions(
        configService,
        configService.getOrThrow<string>('GOOGLE_LINK_CALLBACK_URL'),
      ),
    );
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    try {
      done(null, getGooglePayload(profile));
    } catch (error) {
      done(error, false);
    }
  }
}

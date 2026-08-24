import { registerAs } from '@nestjs/config';

const parseDurationToMs = (value: string): number => {
  const match = value.match(/^(\d+)([smhd])$/);

  if (!match) {
    throw new Error(`Invalid duration: ${value}`);
  }

  const amount = Number(match[1]);
  const unit = match[2] as 's' | 'm' | 'h' | 'd';

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
};

export default registerAs('auth', () => {
  const accessTokenExpiresIn = process.env.ACCESS_TOKEN_EXPIRES_IN!;
  const refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN!;
  const googleTokenExpiresIn = process.env.GOOGLE_TOKEN_EXPIRES_IN!;
  const passwordResetTokenExpiresIn =
    process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN!;

  const invitationTokenExpiresIn = process.env.INVITATION_EXPIRES_IN!;
  const googleOAuthStateExpiresIn = process.env.GOOGLE_OAUTH_STATE_EXPIRES_IN!;

  return {
    accessToken: {
      secret: process.env.ACCESS_TOKEN_SECRET!,
      expiresIn: accessTokenExpiresIn,
      maxAgeMs: parseDurationToMs(accessTokenExpiresIn),
    },

    refreshToken: {
      secret: process.env.REFRESH_TOKEN_SECRET!,
      hashSecret: process.env.REFRESH_TOKEN_HASH_SECRET!,
      expiresIn: refreshTokenExpiresIn,
      maxAgeMs: parseDurationToMs(refreshTokenExpiresIn),
      reuseGraceMs: parseDurationToMs(
        process.env.REFRESH_TOKEN_REUSE_GRACE_MS ?? '30s',
      ),
    },

    google: {
      tokenExpiresInMs: parseDurationToMs(googleTokenExpiresIn),
      oauthStateExpiresInMs: parseDurationToMs(googleOAuthStateExpiresIn),
    },

    passwordReset: {
      expiresIn: passwordResetTokenExpiresIn,
      expiresInMs: parseDurationToMs(passwordResetTokenExpiresIn),
    },

    invitation: {
      expiresIn: invitationTokenExpiresIn,
      expiresInMs: parseDurationToMs(invitationTokenExpiresIn),
    },

    cookie: {
      sameSite: process.env.AUTH_COOKIE_SAMESITE!,
      secure: process.env.AUTH_COOKIE_SECURE === 'true',
    },
  };
});

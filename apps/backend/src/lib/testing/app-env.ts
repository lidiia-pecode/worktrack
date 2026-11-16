import * as dotenv from 'dotenv';

/**
 * Import first in a spec that loads `AppModule`: its settings are validated
 * when the module is imported. Fills only what `.env` and the environment
 * leave unset, as in CI, which provides the database alone.
 */
dotenv.config();

const TEST_SETTINGS: Record<string, string> = {
  FRONTEND_URL: 'http://localhost:3000',
  ACCESS_TOKEN_SECRET: 'test-access-token-secret-at-least-32-chars',
  REFRESH_TOKEN_SECRET: 'test-refresh-token-secret-at-least-32-chars',
  REFRESH_TOKEN_HASH_SECRET: 'test-refresh-hash-secret-at-least-32-chars',
  GOOGLE_CLIENT_ID: 'test-google-client-id',
  GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
  GOOGLE_CALLBACK_URL: 'http://localhost:3000/api/backend/auth/google/callback',
  GOOGLE_SIGNUP_CALLBACK_URL:
    'http://localhost:3000/api/backend/auth/google/signup/callback',
  GOOGLE_LINK_CALLBACK_URL:
    'http://localhost:3000/api/backend/auth/google/link/callback',
  GOOGLE_INVITATION_CALLBACK_URL:
    'http://localhost:3000/api/backend/invitations/google/callback',
  RESEND_API_KEY: 're_test_key',
  MAIL_FROM: 'WorkTrack <test@worktrack.test>',
};

for (const [key, value] of Object.entries(TEST_SETTINGS)) {
  process.env[key] ??= value;
}

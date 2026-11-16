import { envValidationSchema } from './env.validation';

const frontendUrl = envValidationSchema.extract('FRONTEND_URL');

describe('FRONTEND_URL', () => {
  it.each([
    'http://localhost:3000',
    'https://worktrack-frontend-roan.vercel.app',
    'https://app.example.com/',
  ])('accepts the single URL %s', (value) => {
    expect(frontendUrl.validate(value).error).toBeUndefined();
  });

  it.each([
    'http://localhost:3000,https://app.example.com',
    'https://a.example.com,https://b.example.com',
    'https://a.example.com https://b.example.com',
    'ftp://files.example.com',
    'not a url',
  ])('refuses %s', (value) => {
    expect(frontendUrl.validate(value).error).toBeDefined();
  });
});

describe('token lifetimes', () => {
  const accessTokenExpiresIn = envValidationSchema.extract(
    'ACCESS_TOKEN_EXPIRES_IN',
  );

  it.each(['15m', '12h', '30d', '45s'])('accepts %s', (value) => {
    expect(accessTokenExpiresIn.validate(value).error).toBeUndefined();
  });

  // auth.config.ts parses a unit, so a bare number would pass here and then
  // stop the boot with "Invalid duration".
  it.each(['900', '15 m', '1w'])('refuses %s', (value) => {
    expect(accessTokenExpiresIn.validate(value).error).toBeDefined();
  });
});

describe('AUTH_COOKIE_SAMESITE', () => {
  const sameSite = envValidationSchema.extract('AUTH_COOKIE_SAMESITE');

  it.each(['lax', 'strict'])('accepts %s', (value) => {
    expect(sameSite.validate(value).error).toBeUndefined();
  });

  // SameSite is the only CSRF protection, so `none` is never a valid choice.
  it('refuses none', () => {
    expect(sameSite.validate('none').error).toBeDefined();
  });
});

describe('token secrets', () => {
  const SECRET = 'a'.repeat(32);

  const secretsError = (access: string, refresh: string) =>
    envValidationSchema
      .validate(
        { ACCESS_TOKEN_SECRET: access, REFRESH_TOKEN_SECRET: refresh },
        { allowUnknown: true, abortEarly: false },
      )
      .error?.details.filter(({ path }) => path[0] === 'REFRESH_TOKEN_SECRET');

  it('refuses a refresh secret equal to the access secret', () => {
    expect(secretsError(SECRET, SECRET)).toEqual([
      expect.objectContaining({ type: 'any.invalid' }),
    ]);
  });

  it('accepts two different secrets', () => {
    expect(secretsError(SECRET, 'b'.repeat(32))).toEqual([]);
  });
});

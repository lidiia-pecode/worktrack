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

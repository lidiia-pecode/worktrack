import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Database Configuration
  // Either DATABASE_URL on its own, or the five DB_* values.
  DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }),
  DATABASE_SSL: Joi.boolean().default(false),

  DB_HOST: Joi.string().when('DATABASE_URL', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  DB_PORT: Joi.number().port().default(5432),
  DB_USERNAME: Joi.string().when('DATABASE_URL', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  DB_PASSWORD: Joi.string().when('DATABASE_URL', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  DB_NAME: Joi.string().when('DATABASE_URL', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),

  // JWT Configuration
  ACCESS_TOKEN_SECRET: Joi.string().min(32).required(),
  ACCESS_TOKEN_EXPIRES_IN: Joi.string()
    .pattern(/^(\d+[smhd]|\d+)$/)
    .default('1m'),

  REFRESH_TOKEN_EXPIRES_IN: Joi.string()
    .pattern(/^(\d+[smhd]|\d+)$/)
    .default('30d'),

  GOOGLE_TOKEN_EXPIRES_IN: Joi.string()
    .pattern(/^(\d+[smhd]|\d+)$/)
    .default('1m'),

  REFRESH_TOKEN_HASH_SECRET: Joi.string().min(32).required(),

  REFRESH_TOKEN_REUSE_GRACE_MS: Joi.string()
    .pattern(/^\d+[smhd]$/)
    .default('30s'),

  AUTH_COOKIE_SAMESITE: Joi.string()
    .valid('lax', 'strict', 'none')
    .default('lax'),

  AUTH_COOKIE_SECURE: Joi.boolean().default(false),

  // OAuth Google
  GOOGLE_CLIENT_ID: Joi.string().required(),
  GOOGLE_CLIENT_SECRET: Joi.string().required(),

  GOOGLE_CALLBACK_URL: Joi.string().uri().required(),
  GOOGLE_SIGNUP_CALLBACK_URL: Joi.string().uri().required(),
  GOOGLE_LINK_CALLBACK_URL: Joi.string().uri().required(),
  GOOGLE_INVITATION_CALLBACK_URL: Joi.string().uri().required(),

  GOOGLE_OAUTH_STATE_EXPIRES_IN: Joi.string()
    .pattern(/^\d+[smhd]$/)
    .default('10m'),

  PASSWORD_RESET_TOKEN_EXPIRES_IN: Joi.string()
    .pattern(/^\d+[smhd]$/)
    .default('15m'),

  RESEND_API_KEY: Joi.string().required(),

  MAIL_FROM: Joi.string().required(),

  // Frontend & App
  FRONTEND_URL: Joi.string().uri().required(),
  PORT: Joi.number().port().default(3000),

  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
});

import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Database Configuration
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),

  // JWT Configuration
  ACCESS_TOKEN_SECRET: Joi.string().min(32).required(),
  ACCESS_TOKEN_EXPIRES_IN: Joi.string()
    .pattern(/^(\d+[smhdy]|\d+)$/)
    .default('1m'),
  // .default('15m'),

  REFRESH_TOKEN_SECRET: Joi.string().min(32).required(),
  REFRESH_TOKEN_EXPIRES_IN: Joi.string()
    .pattern(/^(\d+[smhdy]|\d+)$/)
    .default('30d'),

  REFRESH_TOKEN_HASH_SECRET: Joi.string().min(32).required(),

  REFRESH_TOKEN_EXPIRES_IN_DAYS: Joi.number().default(30),

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

  // Frontend & App
  FRONTEND_URL: Joi.string().uri().required(),
  PORT: Joi.number().port().default(3000),

  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
});

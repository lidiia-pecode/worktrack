import {
  ClassSerializerInterceptor,
  NestApplicationOptions,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';

import { AppModule } from './app.module';
import { DatabaseExceptionFilter } from './filters/database-exception.filter';
import { createValidationPipe } from './lib/utils/validation-pipe.util';

// The API answers JSON and redirects, so these are the headers that matter.
// The frontend sends the same set (next.config.ts).
const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

/** The app as it serves requests; `main.ts` and the HTTP tests share it. */
export const createApp = async (
  options?: NestApplicationOptions,
): Promise<NestExpressApplication> => {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    ...options,
    bodyParser: false,
  });
  // JSON only, as the frontend sends: a form on another site can't post one,
  // so it can't sign a browser in to an account of its choosing.
  app.useBodyParser('json');
  app.disable('x-powered-by');
  // How many proxies sit in front of us. Too high and a client can fake its
  // own IP through X-Forwarded-For, which would let it dodge the rate limits.
  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1));
  app.useGlobalFilters(new DatabaseExceptionFilter());
  app.use(cookieParser());
  app.use((_req: Request, res: Response, next: NextFunction) => {
    for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
      res.setHeader(header, value);
    }
    next();
  });
  app.useGlobalPipes(createValidationPipe());

  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(reflector, {
      excludeExtraneousValues: true,
    }),
  );
  const frontendUrl = app
    .get(ConfigService)
    .getOrThrow<string>('app.frontendUrl');

  app.enableCors({
    origin: new URL(frontendUrl).origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  return app;
};

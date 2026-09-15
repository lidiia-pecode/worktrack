import * as dotenv from 'dotenv';
dotenv.config();

import {
  BadRequestException,
  ClassSerializerInterceptor,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DatabaseExceptionFilter } from './filters/database-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // How many proxies sit in front of us. Too high and a client can fake its
  // own IP through X-Forwarded-For, which would let it dodge the rate limits.
  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1));
  app.useGlobalFilters(new DatabaseExceptionFilter());
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        const formattedErrors: Record<string, string[]> = {};

        const formatChildErrors = (
          errorList: typeof errors,
          parentPath = '',
        ) => {
          for (const error of errorList) {
            const path = parentPath
              ? `${parentPath}.${error.property}`
              : error.property;

            if (error.constraints) {
              formattedErrors[path] = Object.values(error.constraints);
            }

            if (error.children && error.children.length > 0) {
              formatChildErrors(error.children, path);
            }
          }
        };

        formatChildErrors(errors);

        return new BadRequestException({
          statusCode: 400,
          errors: formattedErrors,
        });
      },
    }),
  );

  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(reflector, {
      excludeExtraneousValues: true,
    }),
  );
  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((url) => url.trim())
    : ['http://localhost:3000'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // API docs are on by default outside production. Set ENABLE_SWAGGER to
  // publish them anyway, for example on staging.
  const enableSwagger = process.env.ENABLE_SWAGGER
    ? process.env.ENABLE_SWAGGER === 'true'
    : process.env.NODE_ENV !== 'production';

  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('Worktrack API')
      .setVersion('1.0')
      .addCookieAuth('access_token')
      .build();

    SwaggerModule.setup(
      'api/docs',
      app,
      SwaggerModule.createDocument(app, config),
    );
  }

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  await app.listen(port);
}

void bootstrap();

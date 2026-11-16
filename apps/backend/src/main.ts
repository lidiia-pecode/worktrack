import * as dotenv from 'dotenv';
dotenv.config();

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { createApp } from './create-app';

async function bootstrap() {
  const app = await createApp();

  // API docs are on by default outside production. Set ENABLE_SWAGGER to
  // publish them anyway, for example on staging.
  const enableSwagger = process.env.ENABLE_SWAGGER
    ? process.env.ENABLE_SWAGGER === 'true'
    : process.env.NODE_ENV !== 'production';

  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('WorkTrack API')
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

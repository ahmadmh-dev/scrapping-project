// Starts the HTTP server.

import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { settings } from './shared/config';

async function start() { 
  const app = await NestFactory.create(AppModule);

  // Every route sits under /api, so we set it in one place.
  app.setGlobalPrefix('api');

  const swagger = new DocumentBuilder()
    .setTitle('Restaurant scraper')
    .setDescription('Scrape restaurant pages and check health.')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, swagger);
  SwaggerModule.setup('docs', app, document, { useGlobalPrefix: true });

  await app.listen(settings.port);
}

start();

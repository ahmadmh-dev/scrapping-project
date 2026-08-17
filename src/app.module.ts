// Wires the app together. Feature modules are added here.
// Mongo connection is opened once; each feature registers its own schemas.

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HealthModule } from './features/health/health.module';
import { ScrapingModule } from './features/scraping/scraping.module';
import { settings } from './shared/config';

@Module({
  imports: [
    MongooseModule.forRoot(settings.mongoUrl),
    HealthModule,
    ScrapingModule,
  ],
})
export class AppModule {}

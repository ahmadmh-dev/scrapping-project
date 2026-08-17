// Scraping feature: accept URLs, process HTML later, save restaurants.

import { Module } from '@nestjs/common';
import { ProcessorService } from './processor.service';
import { ScrapingController } from './scraping.controller';
import { ScrapingMongoModule } from './scraping-mongo.module';
import { ScrapingService } from './scraping.service';

@Module({
  imports: [ScrapingMongoModule],
  controllers: [ScrapingController],
  providers: [ScrapingService, ProcessorService],
})
export class ScrapingModule {}

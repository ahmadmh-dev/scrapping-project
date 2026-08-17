// Registers this feature's Mongo schemas. Connection stays on AppModule.

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RestaurantModel, RestaurantSchema } from './schema/restaurant.schema';
import { ScrapeJobModel, ScrapeJobSchema } from './schema/scrape-job.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RestaurantModel.name, schema: RestaurantSchema },
      { name: ScrapeJobModel.name, schema: ScrapeJobSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class ScrapingMongoModule {}

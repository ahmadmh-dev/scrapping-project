// HTTP entry for the scraping feature.

import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ScrapeRestaurantsRequest } from './dto/scrape-restaurants.request';
import { ScrapeRestaurantsResponse } from './dto/scrape-restaurants.response';
import { ScrapingService } from './scraping.service';

@ApiTags('scraping')
@Controller('scraping')
export class ScrapingController {
  constructor(private readonly scrapingService: ScrapingService) {}

  @Post()
  async scrapeUrls(@Body() body: ScrapeRestaurantsRequest): Promise<ScrapeRestaurantsResponse> {
    return this.scrapingService.scrapeUrls(body);
  }
}

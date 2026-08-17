// Body for starting a scrape: one URL per restaurant page.

import { ApiProperty } from '@nestjs/swagger';

export class ScrapeRestaurantsRequest {
  @ApiProperty({
    example: ['https://example.com/restaurant'],
    type: [String],
  })
  urls: string[];
}

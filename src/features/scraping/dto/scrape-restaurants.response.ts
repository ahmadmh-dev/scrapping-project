// Per-URL scrape outcomes returned to the client.

import { ApiProperty } from '@nestjs/swagger';
import { ParsedRestaurant } from '../schema/restaurant.schema';

export type ScrapeUrlResultStatus = 'on_process' | 'saved' | 'failed';

export class ScrapeUrlResult {
  url: string;
  status: ScrapeUrlResultStatus;
  file?: string;
  error?: string;

  @ApiProperty({ type: Object, required: false })
  restaurant?: ParsedRestaurant;
}

export class ScrapeRestaurantsResponse {
  results: ScrapeUrlResult[];
  message: string;
}

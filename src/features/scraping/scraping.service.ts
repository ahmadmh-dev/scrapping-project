// Opens each restaurant URL with Playwright, saves HTML under results/,
// then parses the page and upserts the restaurant.

import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { Model } from 'mongoose';
import { join } from 'path';
import { chromium } from 'playwright';
import { ScrapeRestaurantsRequest } from './dto/scrape-restaurants.request';
import {
  ScrapeRestaurantsResponse,
  ScrapeUrlResult,
} from './dto/scrape-restaurants.response';
import { ProcessorService } from './processor.service';
import { RestaurantModel } from './schema/restaurant.schema';
import { ScrapeJobModel } from './schema/scrape-job.schema';

@Injectable()
export class ScrapingService {
  constructor(
    @InjectModel(ScrapeJobModel.name)
    private readonly scrapeJobs: Model<ScrapeJobModel>,
    @InjectModel(RestaurantModel.name)
    private readonly restaurants: Model<RestaurantModel>,
    private readonly processor: ProcessorService,
  ) {}

  async scrapeUrls(request: ScrapeRestaurantsRequest): Promise<ScrapeRestaurantsResponse> {
    const urls = (request.urls ?? []).map((url) => url.trim()).filter(Boolean);

    if (urls.length === 0) {
      throw new BadRequestException('Provide at least one restaurant URL.');
    }

    const resultsDir = join(process.cwd(), 'results');
    await mkdir(resultsDir, { recursive: true });

    const results: ScrapeUrlResult[] = [];
    const browser = await chromium.launch({ headless: true });

    try {
      const page = await browser.newPage();

      for (let index = 0; index < urls.length; index++) {
        const url = urls[index];
        const existing = await this.scrapeJobs.findOne({ url });

        if (existing?.status === 'in_process') {
          results.push({ url, status: 'on_process' });
          continue;
        }

        await this.scrapeJobs.findOneAndUpdate(
          { url },
          {
            $set: {
              url,
              status: 'in_process',
              lastScrapingOn: new Date(),
            },
          },
          { upsert: true, new: true },
        );

        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
          const html = await page.content();
          const fileName = buildHtmlFileName(url, index);
          await writeFile(join(resultsDir, fileName), html, 'utf8');

          try {
            const parsed = this.processor.parseHtml(html, url);
            await this.restaurants.findOneAndUpdate(
              { platform: parsed.platform, sourceId: parsed.sourceId },
              { $set: parsed },
              { upsert: true },
            );

            await this.scrapeJobs.updateOne({ url }, { $set: { status: 'done' } });
            results.push({
              url,
              status: 'saved',
              file: fileName,
              restaurant: parsed,
            });
          } catch (err) {
            const error = err instanceof Error ? err.message : String(err);
            await this.scrapeJobs.updateOne({ url }, { $set: { status: 'done' } });//toBeDone failed in processing
            results.push({ url, status: 'saved', file: fileName, error });
          }
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          await this.scrapeJobs.updateOne({ url }, { $set: { status: 'failed' } });
          results.push({ url, status: 'failed', error });
        }
      }
    } finally {
      await browser.close();
    }

    const saved = results.filter((r) => r.status === 'saved').length;
    const onProcess = results.filter((r) => r.status === 'on_process').length;
    const failed = results.filter((r) => r.status === 'failed').length;

    return {
      results,
      message: `Saved ${saved}, on process ${onProcess}, failed ${failed}.`,
    };
  }
}

function buildHtmlFileName(url: string, index: number): string {
  let host = 'page';
  try {
    host = new URL(url).hostname || 'page';
  } catch {
    // Keep default host when the URL cannot be parsed.
  }

  const safeHost = host.replace(/[^a-zA-Z0-9._-]/g, '_');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const shortHash = createHash('sha1').update(url).digest('hex').slice(0, 8);

  return `${safeHost}-${shortHash}-${index}-${stamp}.html`;
}

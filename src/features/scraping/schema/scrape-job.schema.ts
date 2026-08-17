// One scrape job per URL: tracks whether we are scraping it right now.

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ScrapeJobStatus = 'waiting' | 'in_process' | 'done' | 'failed';

export type ScrapeJobDocument = HydratedDocument<ScrapeJobModel>;

@Schema({ collection: 'scrape_jobs', timestamps: true })
export class ScrapeJobModel {
  @Prop({ required: true })
  url: string;

  @Prop({ required: true, enum: ['waiting', 'in_process', 'done', 'failed'] })
  status: ScrapeJobStatus;

  // Set when a scrape run starts for this URL.
  @Prop()
  lastScrapingOn?: Date;
}

export const ScrapeJobSchema = SchemaFactory.createForClass(ScrapeJobModel);

// One job row per URL.
ScrapeJobSchema.index({ url: 1 }, { unique: true });

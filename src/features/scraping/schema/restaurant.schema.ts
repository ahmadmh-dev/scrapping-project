// How a restaurant is stored after we process a scraped HTML page.

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type Address = {
  full?: string;
  street?: string;
  city?: string;
  area?: string;
  country?: string;
};

// MongoDB stores points as [longitude, latitude], in that order.
export type GeoPoint = {
  type: 'Point';
  coordinates: [number, number];
};

export type Rating = {
  score?: number;
  votes?: number;
};

export type MenuItem = {
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  category?: string;
};

// Plain object the HTML parser returns. Same fields as the restaurant document.
export type ParsedRestaurant = {
  platform: string;
  sourceId: string;
  sourceUrl: string;
  name: string;
  description?: string;
  address?: Address;
  location?: GeoPoint;
  cuisines?: string[];
  rating?: Rating;
  priceRange?: string;
  openingHours?: string[];
  phone?: string;
  website?: string;
  images?: string[];
  menuItems?: MenuItem[];
  lastScrapedAt: Date;
};

export type RestaurantDocument = HydratedDocument<RestaurantModel>;

@Schema({ collection: 'restaurants', timestamps: true })
export class RestaurantModel {
  @Prop({ required: true })
  platform: string;

  @Prop({ required: true })
  sourceId: string;

  @Prop({ required: true })
  sourceUrl: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ type: Object })
  address?: Address;

  @Prop({ type: Object })
  location?: GeoPoint;

  @Prop([String])
  cuisines?: string[];

  @Prop({ type: Object })
  rating?: Rating;

  @Prop()
  priceRange?: string;

  @Prop([String])
  openingHours?: string[];

  @Prop()
  phone?: string;

  @Prop()
  website?: string;

  @Prop([String])
  images?: string[];

  @Prop({ type: Array })
  menuItems?: MenuItem[];

  @Prop({ required: true })
  lastScrapedAt: Date;
}
// convert this parameters to mongodb schema
export const RestaurantSchema = SchemaFactory.createForClass(RestaurantModel);

// Two restaurants are the same when they come from the same platform with the same id.
RestaurantSchema.index({ platform: 1, sourceId: 1 }, { unique: true });

// Find a restaurant by the link that was submitted.
RestaurantSchema.index({ sourceUrl: 1 });

// Search by place. Sparse because many pages give no coordinates.
RestaurantSchema.index({ location: '2dsphere' }, { sparse: true });

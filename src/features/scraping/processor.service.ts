// Turns scraped HTML into restaurant fields.
// Reads __NEXT_DATA__ first, then JSON-LD, then a few DOM tags for leftovers.

import { Injectable } from '@nestjs/common';
import { load, type CheerioAPI } from 'cheerio';
import { Address, MenuItem, ParsedRestaurant } from './schema/restaurant.schema';

@Injectable()
export class ProcessorService {
  parseHtml(html: string, pageUrl: string): ParsedRestaurant {
    const page = load(html);
    const restaurant: Partial<ParsedRestaurant> = {
      platform: platformFromUrl(pageUrl),//update to pass from request if needed
      sourceUrl: pageUrl,
      lastScrapedAt: new Date(),
    };

    readNextData(restaurant, page);
    readJsonLd(restaurant, page);
    readDom(restaurant, page);

    if (!restaurant.name || !restaurant.sourceId) {
      throw new Error('Could not find restaurant name and id in the page HTML.');
    }

    return restaurant as ParsedRestaurant;
  }
}

function readNextData(restaurant: Partial<ParsedRestaurant>, page: CheerioAPI): void {
  const raw = page('#__NEXT_DATA__').text();
  if (!raw) {
    return;
  }

  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    return;
  }

  const menuState = data?.props?.pageProps?.initialMenuState;//as in talabat
  if (!menuState) {
    return;
  }

  const branch = menuState.restaurant;
  const area = menuState.area;
  const country = menuState.currentCountry;

  keepIfEmpty(restaurant, 'sourceId', cleanText(branch?.branchId) ?? cleanText(branch?.id));
  keepIfEmpty(restaurant, 'name', cleanText(branch?.name));
  keepIfEmpty(restaurant, 'description', cleanText(branch?.summary));

  keepAddressIfEmpty(restaurant, 'area', cleanText(branch?.areaName));
  keepAddressIfEmpty(restaurant, 'city', cleanText(area?.cityName));
  keepAddressIfEmpty(restaurant, 'country', cleanText(country?.name) ?? cleanText(country?.code));

  if (!restaurant.location && branch?.latitude != null && branch?.longitude != null) {
    const lat = Number(branch.latitude);
    const lng = Number(branch.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      restaurant.location = { type: 'Point', coordinates: [lng, lat] };
    }
  }

  const cuisines: string[] = [];
  if (Array.isArray(branch?.cuisines)) {
    for (const cuisine of branch.cuisines) {
      const name = cleanText(typeof cuisine === 'string' ? cuisine : cuisine?.name);
      if (name) {
        cuisines.push(name);
      }
    }
  }
  if (cuisines.length === 0 && branch?.cuisineString) {
    for (const name of String(branch.cuisineString).split(',')) {
      const cuisine = name.trim();
      if (cuisine) {
        cuisines.push(cuisine);
      }
    }
  }
  keepIfEmpty(restaurant, 'cuisines', cuisines);

  if (!restaurant.rating && branch?.rate != null) {
    const score = Number(branch.rate);
    if (Number.isFinite(score)) {
      const votes = Number(branch.totalRatings);
      restaurant.rating = {
        score,
        votes: Number.isFinite(votes) ? votes : undefined,
      };
    }
  }

  const images: string[] = [];
  for (const url of [branch?.logo, branch?.heroImage]) {
    const image = cleanText(url);
    if (image && !images.includes(image)) {
      images.push(image);
    }
  }
  keepIfEmpty(restaurant, 'images', images);

  const currency = cleanText(country?.currency) ?? cleanText(country?.currencyISO);
  keepIfEmpty(restaurant, 'menuItems', readMenu(menuState.menuData?.items, currency));
}

function readJsonLd(restaurant: Partial<ParsedRestaurant>, page: CheerioAPI): void {
  page('script[type="application/ld+json"]').each(
    (_, node) => {
    const raw = page(node).text();
    if (!raw) {
      return;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    const blocks = Array.isArray(parsed) ? parsed : [parsed];
    for (const block of blocks) {
      const type = block?.['@type'];
      const isRestaurant =
        String(type).toLowerCase() === 'restaurant' ||
        (Array.isArray(type) && type.some((item: unknown) => String(item).toLowerCase() === 'restaurant'));
      if (!isRestaurant) {
        continue;
      }

      keepIfEmpty(restaurant, 'name', cleanText(block.name));

      const idMatch = String(block['@id'] ?? '').match(/\/restaurant\/(\d+)/);
      keepIfEmpty(restaurant, 'sourceId', idMatch?.[1]);

      const images: string[] = [];
      const imageValue = block.image;
      if (typeof imageValue === 'string') {
        const image = cleanText(imageValue);
        if (image) {
          images.push(image);
        }
      } else if (Array.isArray(imageValue)) {
        for (const item of imageValue) {
          const image = cleanText(item);
          if (image && !images.includes(image)) {
            images.push(image);
          }
        }
      }
      keepIfEmpty(restaurant, 'images', images);

      const cuisines: string[] = [];
      if (typeof block.servesCuisine === 'string') {
        for (const name of block.servesCuisine.split(',')) {
          const cuisine = name.trim();
          if (cuisine) {
            cuisines.push(cuisine);
          }
        }
      } else if (Array.isArray(block.servesCuisine)) {
        for (const cuisine of block.servesCuisine) {
          const name = cleanText(typeof cuisine === 'string' ? cuisine : cuisine?.name);
          if (name) {
            cuisines.push(name);
          }
        }
      }
      keepIfEmpty(restaurant, 'cuisines', cuisines);

      const phone = cleanText(block.telephone);
      if (phone && !isFakePhone(phone)) {
        keepIfEmpty(restaurant, 'phone', phone);
      }

      const priceRange = cleanText(block.priceRange);
      if (priceRange && !isFakePriceRange(priceRange)) {
        keepIfEmpty(restaurant, 'priceRange', priceRange);
      }

      const geo = block.geo;
      if (!restaurant.location && geo?.latitude != null && geo?.longitude != null) {
        const lat = Number(geo.latitude);
        const lng = Number(geo.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          restaurant.location = { type: 'Point', coordinates: [lng, lat] };
        }
      }

      const address = block.address;
      if (address) {
        const locality = cleanText(address.addressLocality);
        const street = cleanText(address.streetAddress);
        keepAddressIfEmpty(restaurant, 'city', locality);
        keepAddressIfEmpty(restaurant, 'country', cleanText(address.addressCountry));
        // Talabat puts the area name in streetAddress; that is not a street.
        if (street && locality && street.toLowerCase() === locality.toLowerCase()) {
          keepAddressIfEmpty(restaurant, 'area', street);
        } else {
          keepAddressIfEmpty(restaurant, 'street', street);
        }
      }
    }
  });
}

function readDom(restaurant: Partial<ParsedRestaurant>, page: CheerioAPI): void {
  const titleNode = page('[data-testid="restaurant-title"]').first().clone();
  titleNode.children().remove();
  keepIfEmpty(restaurant, 'name', cleanText(titleNode.text()));

  const cuisines: string[] = [];
  for (const name of page('[data-testid="cuisines"]').first().text().split(',')) {
    const cuisine = name.replace(/\s+/g, ' ').trim();
    if (cuisine) {
      cuisines.push(cuisine);
    }
  }
  keepIfEmpty(restaurant, 'cuisines', cuisines);
}
///need to recheck
function readMenu(items: unknown, currency: string | undefined): MenuItem[] {
  if (!Array.isArray(items)) {
    return [];
  }

  const menu: MenuItem[] = [];

  for (const item of items) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const row = item as Record<string, unknown>;

    // "Picks for you" repeats dishes from real categories.
    if (Number(row.sectionId) === -1) {
      continue;
    }

    const name = cleanText(row.name);
    if (!name) {
      continue;
    }

    const dish: MenuItem = { name };
    const description = cleanText(row.description);
    if (description) {
      dish.description = description;
    }

    const category = cleanText(row.originalSection) ?? cleanText(row.sectionName);
    if (category) {
      dish.category = category;
    }

    if (currency) {
      dish.currency = currency;
    }

    const price = Number(row.price);
    const hasChoices = row.hasChoices === true;
    if (Number.isFinite(price) && !(price === 0 && hasChoices)) {
      dish.price = price;
    }

    menu.push(dish);
  }

  return menu;
}

function keepIfEmpty(
  restaurant: Partial<ParsedRestaurant>,
  field: keyof ParsedRestaurant,
  value: unknown,
): void {
  if (restaurant[field]) {
    return;
  }
  if (value === undefined || value === null || value === '') {
    return;
  }
  if (Array.isArray(value) && value.length === 0) {
    return;
  }
  restaurant[field] = value as never;
}

function keepAddressIfEmpty(
  restaurant: Partial<ParsedRestaurant>,
  field: keyof Address,
  value: string | undefined,
): void {
  if (!value) {
    return;
  }
  if (!restaurant.address) {
    restaurant.address = {};
  }
  if (!restaurant.address[field]) {
    restaurant.address[field] = value;
  }
}

function platformFromUrl(pageUrl: string): string {
  try {
    const host = new URL(pageUrl).hostname.replace(/^www\./, '');
    return host.split('.')[0] || host;
  } catch {
    return 'unknown';
  }
}

function cleanText(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text ? text : undefined;
}

function isFakePhone(phone: string): boolean {
  return /^0+[-0]*$/.test(phone.replace(/\s/g, ''));
}

function isFakePriceRange(priceRange: string): boolean {
  return priceRange.replace(/[\s-]/g, '') === '';
}

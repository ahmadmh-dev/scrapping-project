# Code map

This file lists every file in the project and what it is for.
Keep it in sync whenever a file is added, renamed, moved, or deleted.

Write in beginner English. One short purpose per file.

---

## How to read this map

| Column | Meaning |
| --- | --- |
| File | Path from the project root |
| Purpose | What this file does in plain words |
| Inputs / outputs | What it takes in and what it gives back (if it is code) |

---

## Project files

### Setup files

| File | Purpose |
| --- | --- |
| `package.json` | Project name, scripts, and the list of packages we use. |
| `tsconfig.json` | TypeScript settings. Decorators are on because NestJS needs them. |
| `nest-cli.json` | Tells the Nest command line tool where the source code is. |
| `.env.example` | Example settings. Copy it to `.env` and fill it in. |
| `.gitignore` | Files Git should ignore, such as `node_modules`, `dist`, `.env`, and `results/`. |

### Docs

| File | Purpose |
| --- | --- |
| `CODEMAP.md` | This file. A living list of every file in the project. |

---

## Application code

Feature modules live under `src/features/`. App opens Mongo once; each feature registers its own schemas.

Scraped HTML files are written to `results/` at the project root (gitignored).

### App entry

| File | Purpose | Inputs / outputs |
| --- | --- | --- |
| `src/main.ts` | Starts the server, puts every route under `/api`, and serves Swagger at `/api/docs`. | Reads the settings. Listens on the port. |
| `src/app.module.ts` | Wires the app. Opens Mongo with `forRoot`, then loads feature modules. | No inputs. Imports Health and Scraping. |
| `src/shared/config.ts` | Reads the settings from `.env` once. Stops the app if a needed setting is missing. | Reads `PORT` and `MONGO_URL`. Returns the `settings` object. |

### Health feature

| File | Purpose | Inputs / outputs |
| --- | --- | --- |
| `src/features/health/health.module.ts` | Registers the health controller. | No inputs. |
| `src/features/health/health.controller.ts` | Answers `GET /api/health` so you can see the server is alive and if MongoDB is reachable. | No input. Returns `{ "status": "ok", "database": "up" }`. |

### Scraping feature

| File | Purpose | Inputs / outputs |
| --- | --- | --- |
| `src/features/scraping/scraping.module.ts` | Wires the scraping controller and services, and imports this feature's Mongo module. | No inputs. |
| `src/features/scraping/scraping-mongo.module.ts` | Registers restaurant and scrape-job schemas for this feature. | No inputs. Exports Mongoose models for scraping. |
| `src/features/scraping/scraping.controller.ts` | HTTP entry for scraping. | `POST /api/scraping` with a list of URLs. Returns per-URL results. |
| `src/features/scraping/scraping.service.ts` | Checks job status, opens pages with Playwright, saves HTML under `results/`, then parses and upserts the restaurant. | Takes URLs. Returns saved / on_process / failed results, plus the full restaurant when parse works. |
| `src/features/scraping/processor.service.ts` | Reads restaurant fields from saved HTML with Cheerio: `__NEXT_DATA__`, then JSON-LD, then a few DOM tags. | Takes HTML and the page URL. Returns restaurant fields. Does not talk to Mongo. |
| `src/features/scraping/dto/scrape-restaurants.request.ts` | Body shape: a list of restaurant page URLs. | `{ urls: string[] }` |
| `src/features/scraping/dto/scrape-restaurants.response.ts` | Reply with one result per URL. | `{ results, message }` — a result may include `file`, `error`, and the full restaurant (name, address, menu, and the rest). |
| `src/features/scraping/schema/restaurant.schema.ts` | How a restaurant is stored after HTML is processed, plus indexes. Address can include area. Menu items can include a description. | No inputs. Gives the `restaurants` collection shape. |
| `src/features/scraping/schema/scrape-job.schema.ts` | One job per URL: status and last scrape time. Blocks a second scrape while `in_process`. | No inputs. Gives the `scrape_jobs` collection shape. |

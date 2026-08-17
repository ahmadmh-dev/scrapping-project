// All settings live here. No other file should read process.env.

import 'dotenv/config';

export const settings = {
  port: Number(process.env.PORT ?? 3000),
  mongoUrl: readRequired('MONGO_URL'),
};

// Stop right away with a clear message, instead of breaking later on a real request.
function readRequired(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing setting ${name}. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

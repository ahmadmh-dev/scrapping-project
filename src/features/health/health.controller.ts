// Simple check that the server is up and whether it can talk to MongoDB.

import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ApiTags } from '@nestjs/swagger';
import { Connection } from 'mongoose';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly database: Connection) {}

  @Get()
  check() {
    // Mongoose keeps retrying on its own, so we only report what we see right now.
    const connected = this.database.readyState === 1;
    return {
      status: 'ok',
      database: connected ? 'up' : 'down',
    };
  }
}

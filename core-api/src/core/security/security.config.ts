import { ThrottlerModuleOptions } from '@nestjs/throttler';

export const throttlerConfig: ThrottlerModuleOptions = [{
    ttl: 60000, // 60 seconds time-to-live window
    limit: 100, // Maximum of 100 requests per IP within the TTL
}];
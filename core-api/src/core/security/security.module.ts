import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { globalThrottlerGuardProvider } from './providers/throttler-guard.provider';
import { throttlerConfig } from './security.config';

@Module({
    imports: [
        ThrottlerModule.forRoot(throttlerConfig),
    ],
    providers: [
        globalThrottlerGuardProvider,
    ],
})
export class SecurityModule { }
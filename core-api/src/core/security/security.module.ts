import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { throttlerConfig } from './security.config';
import { globalThrottlerGuardProvider } from './providers/throttler-guard.provider';

@Module({
    imports: [
        ThrottlerModule.forRoot(throttlerConfig),
    ],
    providers: [
        globalThrottlerGuardProvider,
    ],
})
export class SecurityModule { }
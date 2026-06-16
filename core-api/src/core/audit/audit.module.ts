import { Module } from '@nestjs/common';
import { MessagingModule } from '../messaging/messaging.module';
import { AuditService } from './audit.service';
import { globalAuditInterceptorProvider } from './providers/audit-interceptor.provider';
import { globalAllExceptionsFilterProvider } from './providers/all-exceptions-filter.provider';

@Module({
    imports: [MessagingModule],
    providers: [
        AuditService,
        globalAuditInterceptorProvider,
        globalAllExceptionsFilterProvider,
    ],
    exports: [AuditService],
})
export class AuditModule { }
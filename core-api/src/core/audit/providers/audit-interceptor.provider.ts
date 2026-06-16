import { Provider } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from '../audit.interceptor';

export const globalAuditInterceptorProvider: Provider = {
    provide: APP_INTERCEPTOR,
    useClass: AuditInterceptor,
};
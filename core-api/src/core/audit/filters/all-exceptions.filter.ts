import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuditService } from '../audit.service';
import { ExceptionParser } from '../utils/exception-parser.util';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    constructor(private readonly auditService: AuditService) {}

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        // 1. Delegate parsing logic to the pure utility class
        const status = ExceptionParser.parseStatus(exception);
        const internalError = ExceptionParser.buildInternalTelemetry(exception);
        const safeClientPayload = ExceptionParser.buildClientResponse(exception, status);

        // Assume near-zero latency for errors caught outside the main interceptor flow (e.g., Guards)
        const latencyMs = 0; 

        // 2. Dispatch full technical details to the Log Service
        this.auditService.logHttpTransaction(request, status, latencyMs, internalError);

        // 3. Return the sanitized response to the frontend client
        response.status(status).json({
            ...safeClientPayload,
            timestamp: new Date().toISOString(),
            path: request.url,
            traceId: request['traceId'],
        });
    }
}
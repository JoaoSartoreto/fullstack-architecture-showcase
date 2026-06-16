import { HttpException, HttpStatus } from '@nestjs/common';

export class ExceptionParser {
    // 1. Extracts the exact HTTP Status Code
    static parseStatus(exception: unknown): number {
        return exception instanceof HttpException
            ? exception.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;
    }

    // 2. Builds the raw, technical payload for the RabbitMQ/Log DB (Internal Eyes Only)
    static buildInternalTelemetry(exception: unknown) {
        const rawName = exception instanceof Error ? exception.name : 'UnknownError';
        const rawMessage = exception instanceof Error ? exception.message : String(exception);
        const rawStack = exception instanceof Error ? exception.stack : 'No stack trace available';

        return {
            name: rawName,
            message: `${rawMessage} | Stack: ${rawStack?.substring(0, 500)}...`,
        };
    }

    // 3. Sanitizes the error for the Frontend, preventing infrastructure leaks
    static buildClientResponse(exception: unknown, status: number) {
        const clientResponse = exception instanceof HttpException
            ? exception.getResponse()
            : { statusCode: status, message: 'Internal Server Error' };

        return typeof clientResponse === 'object' && clientResponse !== null
            ? clientResponse
            : { message: clientResponse };
    }
}
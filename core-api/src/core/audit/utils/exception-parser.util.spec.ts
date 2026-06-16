import { HttpException, HttpStatus } from '@nestjs/common';
import { ExceptionParser } from './exception-parser.util';

describe('ExceptionParser', () => {
    describe('parseStatus', () => {
        it('should return the exact status from an HttpException', () => {
            const exception = new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
            expect(ExceptionParser.parseStatus(exception)).toBe(HttpStatus.BAD_REQUEST);
        });

        it('should default to INTERNAL_SERVER_ERROR (500) for standard Errors', () => {
            const exception = new Error('Database explosion');
            expect(ExceptionParser.parseStatus(exception)).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        });
    });

    describe('buildInternalTelemetry', () => {
        it('should extract name, message, and stack from a standard Error object', () => {
            const exception = new Error('Something went terribly wrong');
            const result = ExceptionParser.buildInternalTelemetry(exception);

            expect(result.name).toBe('Error');
            expect(result.message).toContain('Something went terribly wrong | Stack:');
            expect(result.message).toContain('Error: Something went terribly wrong');
        });

        it('should handle unknown exceptions gracefully', () => {
            const exception = 'Just a random thrown string';
            const result = ExceptionParser.buildInternalTelemetry(exception);

            expect(result.name).toBe('UnknownError');
            expect(result.message).toBe('Just a random thrown string | Stack: No stack trace available...');
        });
    });

    describe('buildClientResponse', () => {
        it('should return the HttpException response object if available', () => {
            const exception = new HttpException({ customCode: 4001, message: 'Invalid data' }, 400);
            const result = ExceptionParser.buildClientResponse(exception, 400);

            expect(result).toEqual({ customCode: 4001, message: 'Invalid data' });
        });

        it('should wrap a string HttpException response into an object', () => {
            const exception = new HttpException('Simple string error', 400);
            const result = ExceptionParser.buildClientResponse(exception, 400);

            expect(result).toEqual({ message: 'Simple string error' });
        });

        it('should sanitize non-HTTP exceptions, returning a generic 500 response', () => {
            const exception = new Error('Critical database credential leak');
            const result = ExceptionParser.buildClientResponse(exception, 500);

            // Proves that the sensitive "credential leak" message did NOT go to the client
            expect(result).toEqual({ statusCode: 500, message: 'Internal Server Error' });
        });
    });
});
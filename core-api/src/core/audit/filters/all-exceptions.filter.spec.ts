import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response } from 'express';
import { AuditService } from '../audit.service';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
    let filter: AllExceptionsFilter;
    let auditService: jest.Mocked<Partial<AuditService>>;

    beforeEach(async () => {
        jest.clearAllMocks();

        auditService = {
            logHttpTransaction: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AllExceptionsFilter,
                { provide: AuditService, useValue: auditService },
            ],
        }).compile();

        filter = module.get<AllExceptionsFilter>(AllExceptionsFilter);
    });

    it('should be defined', () => {
        expect(filter).toBeDefined();
    });

    it('should catch exceptions, log telemetry, and return sanitized JSON to the client', () => {
        // Arrange: Mocking the Express Request and Response objects inside ArgumentsHost
        const mockRequest = {
            url: '/api/v1/orders',
            traceId: 'trace-12345',
        } as unknown as Request;

        const mockJsonResponse = jest.fn();
        const mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: mockJsonResponse,
        } as unknown as Response;

        const mockArgumentsHost = {
            switchToHttp: jest.fn().mockReturnValue({
                getRequest: jest.fn().mockReturnValue(mockRequest),
                getResponse: jest.fn().mockReturnValue(mockResponse),
            }),
        } as unknown as ArgumentsHost;

        // Creating a standard HttpException
        const exception = new HttpException('Invalid order structure', HttpStatus.BAD_REQUEST);

        // Act
        filter.catch(exception, mockArgumentsHost);

        // Assert: Verify AuditService received the correct technical details
        expect(auditService.logHttpTransaction).toHaveBeenCalledTimes(1);
        expect(auditService.logHttpTransaction).toHaveBeenCalledWith(
            mockRequest,
            HttpStatus.BAD_REQUEST,
            0, // Latency is assumed 0 for filtered exceptions
            expect.objectContaining({
                name: 'HttpException',
                message: expect.stringContaining('Invalid order structure'),
            })
        );

        // Assert: Verify the Client received the formatted JSON response
        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
        expect(mockJsonResponse).toHaveBeenCalledWith(
            expect.objectContaining({
                message: 'Invalid order structure',
                path: '/api/v1/orders',
                traceId: 'trace-12345',
                timestamp: expect.any(String), // Ensures the ISO string was generated
            })
        );
    });
});
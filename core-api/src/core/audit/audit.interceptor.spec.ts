import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { lastValueFrom, of, throwError } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';

describe('AuditInterceptor', () => {
    let interceptor: AuditInterceptor;
    let auditService: jest.Mocked<Partial<AuditService>>;

    beforeEach(async () => {
        jest.clearAllMocks();

        // 1. Mock the AuditService
        auditService = {
            logHttpTransaction: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuditInterceptor,
                { provide: AuditService, useValue: auditService },
            ],
        }).compile();

        interceptor = module.get<AuditInterceptor>(AuditInterceptor);
    });

    it('should be defined', () => {
        expect(interceptor).toBeDefined();
    });

    describe('intercept', () => {
        it('should log the HTTP transaction when the request is successful', async () => {
            // Arrange: Simulate Express Request and Response objects
            const mockRequest = { method: 'POST', url: '/orders' };
            const mockResponse = { statusCode: 201 };

            const mockExecutionContext = {
                switchToHttp: jest.fn().mockReturnValue({
                    getRequest: jest.fn().mockReturnValue(mockRequest),
                    getResponse: jest.fn().mockReturnValue(mockResponse),
                }),
            } as unknown as ExecutionContext;

            // Simulate the Controller successfully returning data wrapped in an RxJS Observable
            const mockCallHandler = {
                handle: jest.fn().mockReturnValue(of({ success: true })),
            } as unknown as CallHandler;

            // Act: Execute the interceptor and wait for the observable to resolve
            const result = await lastValueFrom(interceptor.intercept(mockExecutionContext, mockCallHandler));

            // Assert: Verify the response was passed through untouched
            expect(result).toEqual({ success: true });

            // Assert: Verify the audit service was triggered with the correct parameters
            expect(auditService.logHttpTransaction).toHaveBeenCalledTimes(1);
            expect(auditService.logHttpTransaction).toHaveBeenCalledWith(
                mockRequest,
                201,
                expect.any(Number) // Ensures latency is calculated and passed as a number
            );
        });

        it('should NOT log the HTTP transaction if the controller throws an exception', async () => {
            // Arrange: Setup standard HTTP context
            const mockExecutionContext = {
                switchToHttp: jest.fn().mockReturnValue({
                    getRequest: jest.fn().mockReturnValue({}),
                    getResponse: jest.fn().mockReturnValue({}),
                }),
            } as unknown as ExecutionContext;

            // Simulate a failure inside the Controller (e.g., throwing a BadRequestException)
            const mockError = new Error('Controller exploded');
            const mockCallHandler = {
                handle: jest.fn().mockReturnValue(throwError(() => mockError)),
            } as unknown as CallHandler;

            // Act & Assert: Expect the execution to throw the exact same error
            await expect(lastValueFrom(interceptor.intercept(mockExecutionContext, mockCallHandler)))
                .rejects
                .toThrow(mockError);

            // Assert: Crucial check. The 'tap' operator only listens to the 'next' signal. 
            // Since it threw an error, the logging method should never be called.
            expect(auditService.logHttpTransaction).not.toHaveBeenCalled();
        });
    });
});
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { of, throwError } from 'rxjs';
import { RABBITMQ_CLIENT_TOKEN } from '../messaging/messaging.config';
import { AuditService } from './audit.service';

describe('AuditService', () => {
    let service: AuditService;
    let rmqClientMock: any;

    beforeEach(async () => {
        // 1. Create a mock for the RabbitMQ Client
        rmqClientMock = {
            // We use RxJS 'of(null)' to simulate a successful asynchronous emission
            emit: jest.fn().mockReturnValue(of(null)),
        };

        // 2. Setup the isolated testing module
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuditService,
                {
                    provide: RABBITMQ_CLIENT_TOKEN,
                    useValue: rmqClientMock,
                },
            ],
        }).compile();

        service = module.get<AuditService>(AuditService);

        // Spy on the NestJS Logger to prevent test output pollution and allow assertions
        jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('logHttpTransaction', () => {
        it('should correctly build and emit an HTTP log envelope', () => {
            // Arrange: Mock the Express Request object
            const mockRequest = {
                traceId: 'trace-123',
                user: { sub: 'user-456' },
                method: 'POST',
                url: '/api/orders',
                ip: '127.0.0.1',
            } as unknown as Request;

            // Act
            service.logHttpTransaction(mockRequest, 201, 45);

            // Assert
            expect(rmqClientMock.emit).toHaveBeenCalledTimes(1);
            expect(rmqClientMock.emit).toHaveBeenCalledWith(
                'audit_logs_queue',
                expect.objectContaining({
                    trace_id: 'trace-123',
                    actor_id: 'user-456',
                    event_type: 'HTTP_TRANSACTION',
                    payload: {
                        http: {
                            method: 'POST',
                            path: '/api/orders',
                            status_code: 201,
                            latency_ms: 45,
                            ip: '127.0.0.1',
                        },
                    },
                }),
            );
        });

        it('should fallback to Logger.error if RabbitMQ is unreachable', () => {
            // Arrange
            const mockRequest = { traceId: 'trace-123' } as unknown as Request;
            const mockError = new Error('Connection refused');

            // Force the RabbitMQ mock to throw an observable error
            rmqClientMock.emit.mockReturnValueOnce(throwError(() => mockError));
            const loggerSpy = jest.spyOn(Logger.prototype, 'error');

            // Act
            service.logHttpTransaction(mockRequest, 200, 10);

            // Assert
            expect(rmqClientMock.emit).toHaveBeenCalledTimes(1);
            expect(loggerSpy).toHaveBeenCalledTimes(1);
            expect(loggerSpy).toHaveBeenCalledWith(
                expect.stringContaining('Broker unreachable. Dropping HTTP log for Trace: trace-123'),
                mockError.stack
            );
        });
    });

    describe('logDataMutation', () => {
        it('should correctly build and emit a DATA_MUTATION envelope', () => {
            // Act
            service.logDataMutation(
                'trace-789',
                'user-999',
                'orders',
                'order-1',
                'INSERT'
            );

            // Assert
            expect(rmqClientMock.emit).toHaveBeenCalledTimes(1);
            expect(rmqClientMock.emit).toHaveBeenCalledWith(
                'audit_logs_queue',
                expect.objectContaining({
                    trace_id: 'trace-789',
                    actor_id: 'user-999',
                    event_type: 'DATA_MUTATION',
                    payload: {
                        entity: 'orders',
                        entity_id: 'order-1',
                        operation: 'INSERT',
                    },
                }),
            );
        });
    });
});
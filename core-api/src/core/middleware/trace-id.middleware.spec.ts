import { Request, Response } from 'express';
import { traceIdMiddleware } from './trace-id.middleware';
import { RequestContext } from '../context/request-context';

// Mocks the RequestContext to intercept the 'run' method without needing a real AsyncLocalStorage context
jest.mock('../context/request-context', () => ({
    RequestContext: {
        // Simulates ALS run: receives the state and immediately executes the callback (next function)
        run: jest.fn((store, callback) => callback()),
    },
}));

describe('TraceIdMiddleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        mockRequest = {
            headers: {},
        };

        mockResponse = {
            setHeader: jest.fn(),
        };

        nextFunction = jest.fn();
    });

    it('should be defined', () => {
        expect(traceIdMiddleware).toBeDefined();
    });

    it('should use existing x-trace-id from headers if provided by the client', () => {
        // Arrange: Simulate an incoming request from another microservice
        // Express automatically lowercases incoming headers in req.headers
        const existingTraceId = 'external-trace-123';
        mockRequest.headers = { 'x-trace-id': existingTraceId };

        // Act
        traceIdMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

        // Assert
        expect(RequestContext.run).toHaveBeenCalledWith(
            expect.objectContaining({ traceId: existingTraceId }),
            expect.any(Function)
        );
        // Corrected expectation to match the exact string case used in the middleware implementation
        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Trace-Id', existingTraceId);
        expect(nextFunction).toHaveBeenCalledTimes(1);
    });

    it('should generate a new trace ID if x-trace-id is missing in headers', () => {
        // Arrange: Simulate a direct client request with no headers
        mockRequest.headers = {};

        // Act
        traceIdMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

        // Assert
        expect(RequestContext.run).toHaveBeenCalledWith(
            expect.objectContaining({
                // Verifies that a generated string (UUID) was injected into the state
                traceId: expect.any(String)
            }),
            expect.any(Function)
        );

        // Corrected expectation to match the exact string case used in the middleware implementation
        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Trace-Id', expect.any(String));
        expect(nextFunction).toHaveBeenCalledTimes(1);
    });
});
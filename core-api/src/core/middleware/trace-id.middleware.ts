import { Request, Response, NextFunction } from 'express';
import { v7 as uuidv7 } from 'uuid';
import { RequestContext, AppRequestContext } from '../context/request-context';

export function traceIdMiddleware(req: Request, res: Response, next: NextFunction) {
    const incomingTraceId = req.headers['x-trace-id'] as string;
    const traceId = incomingTraceId || uuidv7();

    req['traceId'] = traceId;
    res.setHeader('X-Trace-Id', traceId);

    // 1. Initialize the state for this specific request
    const store: AppRequestContext = {
        traceId: traceId,
        actorId: null, // We don't know the user yet, the JWT Guard hasn't run!
    };

    // 2. Wrap the rest of the application execution inside the ALS "bubble"
    RequestContext.run(store, () => {
        next(); // Yields control to Guards, Controllers, and Services
    });
}
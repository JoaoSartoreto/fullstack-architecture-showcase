import { AsyncLocalStorage } from 'async_hooks';

// 1. Strict definition of what we carry in the background
export interface AppRequestContext {
    traceId: string;
    actorId: string | null;
}

// 2. The native Node.js storage instance. 
// Think of this as a globally accessible variable that is safe for concurrent requests.
export const RequestContext = new AsyncLocalStorage<AppRequestContext>();
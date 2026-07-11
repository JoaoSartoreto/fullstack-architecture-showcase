import * as crypto from 'crypto';

/**
 * Mocks the UUIDv7 generator with Node's native v4 randomUUID for testing environments.
 * This effectively bypasses the ESM/CJS compatibility nightmare introduced by uuid v10+ in Jest.
 */
export const v7 = (): string => crypto.randomUUID();
export const v4 = (): string => crypto.randomUUID();

export default { v7, v4 };
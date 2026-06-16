// A deterministic UUID for testing purposes. 
// This makes assertions predictable and bypasses the Jest ESM compilation issue with the real 'uuid' v10 package.
const MOCK_UUID = '00000000-0000-7000-8000-000000000000';

export const v7 = () => MOCK_UUID;
export const v4 = () => MOCK_UUID;
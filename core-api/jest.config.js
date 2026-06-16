module.exports = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: 'src',
    testRegex: '.*\\.spec\\.ts$',
    transform: {
        '^.+\\.(t|j)s$': 'ts-jest',
    },
    collectCoverageFrom: [
        '**/*.(t|j)s',
        '!**/*.controller.(t|j)s', // Ignores HTTP routing layers
        '!**/*.module.(t|j)s',     // Ignores NestJS module wiring
        '!**/*.dto.(t|j)s',        // Ignores Data Transfer Objects (just types/validation decorators)
        '!**/main.(t|j)s',         // Ignores the bootstrap file
    ],
    coverageDirectory: '../coverage',
    testEnvironment: 'node',

    // This solves the ESM vs CommonJS issue with the uuid package
    moduleNameMapper: {
        '^uuid$': '<rootDir>/common/mocks/uuid.mock.ts',
    },
};
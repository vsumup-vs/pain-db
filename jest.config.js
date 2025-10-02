module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/frontend/'],
  maxWorkers: 1,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup-no-accelerate.js'],
  testTimeout: 15000,
  clearMocks: true,
  forceExit: true,
  detectOpenHandles: true,
  maxWorkers: 1 // Run tests sequentially to prevent database interference
};
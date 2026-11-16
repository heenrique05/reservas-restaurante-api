/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  // O SWC traduz o TypeScript para o Jest (o ts-jest ainda não suporta o TypeScript 7).
  transform: { '^.+\\.ts$': '@swc/jest' },
  roots: ['<rootDir>/src'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  globalSetup: '<rootDir>/src/testes/globalSetup.ts',
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/server.ts', '!src/database/migrar.ts'],
};

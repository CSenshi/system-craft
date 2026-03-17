import { readFileSync } from 'fs';

const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8'),
);

swcJestConfig.swcrc = false;

export default {
  displayName: '@apps/web-crawler:chaos',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: 'test-output/jest/coverage-chaos',
  testMatch: ['**/*.chaos.spec.ts'],
  testTimeout: 60_000,
  maxWorkers: 1,
};

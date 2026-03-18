const { readFileSync } = require('fs');
const { resolve } = require('path');

const swcJestConfig = JSON.parse(
  readFileSync(resolve(__dirname, '.spec.swcrc'), 'utf-8'),
);

swcJestConfig.swcrc = false;

module.exports = {
  displayName: '@apps/url-shortener:chaos',
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

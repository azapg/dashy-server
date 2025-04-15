export const preset = 'ts-jest';
export const testEnvironment = 'node';
export const testMatch = ['**/*.test.ts', '**/*.spec.ts'];
export const moduleFileExtensions = ['ts', 'tsx', 'js', 'jsx', 'json', 'node'];
export const setupFiles = ["./.jest/setEnvVars.js"]
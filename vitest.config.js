import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{js,jsx}'],
    reporters: ['default', 'json'],
    outputFile: { json: 'test-results/unit.json' },
    coverage: {
      enabled: true,
      provider: 'v8',
      include: ['server/**/*.js'],
      exclude: ['server/index.js'],
      reporter: ['text-summary', 'json-summary'],
      reportsDirectory: 'coverage',
    },
  },
});

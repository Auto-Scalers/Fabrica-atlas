# Jest / Vitest Setup

## What
Setup and configuration patterns for Jest and Vitest test runners in the Fabrica Express + Next.js stack.

## When
Referenced by test mode's `compiler_rules.md` and `scenario_rules.md` when setting up or running test suites.

## Vitest Config (Recommended for Vite-based projects)
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      reporter: ['text', 'json'],
      exclude: ['node_modules/', 'dist/']
    }
  }
})
```

## Jest Config (For Express-only server testing)
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterFramework: ['./src/test/setup.ts'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
}
```

## Test Setup File
```typescript
// src/test/setup.ts
import { vi } from 'vitest'

// Mock Supabase to prevent real DB calls in tests
vi.mock('../components/auth/supabase', () => ({
  getSupabase: () => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ data: [], error: null }),
  })
}))

// Set test environment variables
process.env.SUPABASE_URL = 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE = 'test-service-key'
```

## Running Tests
```bash
npx vitest run              # Run once
npx vitest run --coverage   # With coverage report
npx vitest watch            # Watch mode
```

# End-to-End Testing with Playwright

This directory contains end-to-end tests for the Epic.ai voice agent platform.

## Setup

Install dependencies:
```bash
npm install
npx playwright install
```

## Running Tests

Run all tests:
```bash
npx playwright test
```

Run tests in UI mode (recommended for development):
```bash
npx playwright test --ui
```

Run tests in headed mode (see the browser):
```bash
npx playwright test --headed
```

Run specific test file:
```bash
npx playwright test e2e/voice-chat.spec.ts
```

Run tests in specific browser:
```bash
npx playwright test --project=chromium
```

## Debugging Tests

Debug mode:
```bash
npx playwright test --debug
```

Show test report:
```bash
npx playwright show-report
```

## Test Structure

### `voice-chat.spec.ts`
Tests for the Voice Chat interface:
- Page rendering and components
- Agent selection
- Visualizer style switching
- Connection controls
- Microphone controls
- Responsive design

### `navigation.spec.ts`
Tests for navigation:
- Page navigation between all routes
- Active link highlighting
- Sidebar display
- User profile display

### `agents.spec.ts`
Tests for Agent Management:
- Agent list display
- Create agent wizard
- Agent cards and details
- Edit and delete functionality
- Refresh functionality

## Best Practices

1. **Use data-testid attributes** for stable element selection
2. **Avoid hard-coded waits** - use Playwright's auto-waiting
3. **Test user flows** - not just individual elements
4. **Keep tests independent** - each test should be able to run in isolation
5. **Use page objects** for complex pages (when needed)

## Configuration

See `playwright.config.ts` for configuration options:
- Test directory: `./e2e`
- Base URL: `http://localhost:3001`
- Reporters: HTML
- Screenshots: On failure
- Video: On failure
- Trace: On first retry

## CI/CD

Tests are configured to run in CI environments with:
- Retries: 2 attempts
- Serial execution (1 worker)
- No test.only allowed

## Writing New Tests

Example test structure:
```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('/your-page')
  })

  test('should do something', async ({ page }) => {
    // Arrange
    const element = page.getByRole('button', { name: 'Click me' })

    // Act
    await element.click()

    // Assert
    await expect(page.getByText('Success')).toBeVisible()
  })
})
```

## Tips

- Use `page.pause()` to pause execution and inspect the page
- Use `test.only()` to run a single test during development
- Use `test.skip()` to temporarily disable a test
- Check Playwright documentation: https://playwright.dev

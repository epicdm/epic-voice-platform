/**
 * E2E Test: Dashboard Load & Stats Display (T040)
 * Tests User Story 3 - Dashboard real-time data display
 *
 * Test scenarios:
 * 1. Dashboard loads with skeleton loaders
 * 2. Skeletons replaced with actual stats
 * 3. All 6 stat cards display correctly
 * 4. Recent calls widget shows data
 * 5. Zero data handled gracefully
 * 6. Error states handled with retry
 */

import { test, expect } from "@playwright/test";

test.describe("Dashboard Stats Display", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("dashboard loads with skeleton loaders then displays stats", async ({ page }) => {
    // Verify skeleton loaders appear initially
    await expect(page.locator('[data-testid="stat-skeleton"]').first()).toBeVisible();

    // Wait for skeletons to be replaced with actual data
    await expect(page.locator('[data-testid="stat-card"]').first()).toBeVisible({ timeout: 5000 });

    // Verify skeletons are gone
    await expect(page.locator('[data-testid="stat-skeleton"]')).not.toBeVisible();
  });

  test("displays all 6 stat cards with correct data", async ({ page }) => {
    // Wait for stats to load
    await expect(page.locator('[data-testid="stat-card"]').first()).toBeVisible({ timeout: 5000 });

    // Verify 6 stat cards present
    const statCards = page.locator('[data-testid="stat-card"]');
    await expect(statCards).toHaveCount(6);

    // Verify each stat card has expected structure
    await expect(page.locator('text=Total Agents')).toBeVisible();
    await expect(page.locator('text=Phone Numbers')).toBeVisible();
    await expect(page.locator('text=Calls Today')).toBeVisible();
    await expect(page.locator('text=Calls This Month')).toBeVisible();
    await expect(page.locator('text=Cost Today')).toBeVisible();
    await expect(page.locator('text=Cost This Month')).toBeVisible();

    // Verify values are numbers (not placeholders)
    const totalAgentsValue = await page.locator('[data-testid="stat-card"]:has-text("Total Agents")').locator('[data-testid="stat-value"]').textContent();
    expect(totalAgentsValue).toMatch(/^\d+$/);
  });

  test("displays recent calls widget", async ({ page }) => {
    // Wait for stats to load
    await expect(page.locator('[data-testid="stat-card"]').first()).toBeVisible({ timeout: 5000 });

    // Verify recent calls section exists
    await expect(page.locator('text=Recent Calls')).toBeVisible();

    // Check for recent calls list or empty state
    const hasCallsTable = await page.locator('[data-testid="recent-calls-table"]').isVisible();
    const hasEmptyState = await page.locator('text=No recent calls yet').isVisible();

    expect(hasCallsTable || hasEmptyState).toBeTruthy();
  });

  test("handles zero data gracefully", async ({ page }) => {
    // Mock empty stats response
    await page.route("**/api/user/stats", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            total_agents: 0,
            total_phone_numbers: 0,
            total_calls_today: 0,
            total_calls_month: 0,
            total_cost_today_usd: 0,
            total_cost_month_usd: 0,
          },
        }),
      });
    });

    await page.reload();

    // Wait for stats to load
    await expect(page.locator('[data-testid="stat-card"]').first()).toBeVisible({ timeout: 5000 });

    // Verify zero values displayed
    await expect(page.locator('text=Total Agents')).toBeVisible();
    const totalAgentsCard = page.locator('[data-testid="stat-card"]:has-text("Total Agents")');
    await expect(totalAgentsCard.locator('[data-testid="stat-value"]')).toHaveText("0");

    // Verify helpful message appears
    await expect(page.locator('text=Create your first agent to get started')).toBeVisible();
  });

  test("error state handled with retry", async ({ page }) => {
    // Mock API error
    await page.route("**/api/user/stats", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to fetch dashboard stats",
          },
        }),
      });
    });

    await page.reload();

    // Verify error message displayed
    await expect(page.locator('text=Failed to load dashboard stats')).toBeVisible({ timeout: 5000 });

    // Verify retry button exists
    await expect(page.locator('button:has-text("Retry")')).toBeVisible();
  });

  test("no console errors during load", async ({ page }) => {
    const consoleErrors: string[] = [];

    // Capture console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Wait for page to fully load
    await page.waitForLoadState("networkidle");

    // Verify no console errors
    expect(consoleErrors.length).toBe(0);
  });

  test("stat cards show loading state then update", async ({ page }) => {
    // Intercept API call to delay response
    await page.route("**/api/user/stats", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      route.continue();
    });

    await page.reload();

    // Verify skeletons visible during load
    await expect(page.locator('[data-testid="stat-skeleton"]').first()).toBeVisible();

    // Wait for data to load
    await expect(page.locator('[data-testid="stat-card"]').first()).toBeVisible({ timeout: 5000 });

    // Verify actual values displayed
    const statCards = page.locator('[data-testid="stat-card"]');
    await expect(statCards).toHaveCount(6);
  });

  test("cost values formatted correctly", async ({ page }) => {
    // Wait for stats to load
    await expect(page.locator('[data-testid="stat-card"]').first()).toBeVisible({ timeout: 5000 });

    // Find cost cards
    const costTodayCard = page.locator('[data-testid="stat-card"]:has-text("Cost Today")');
    const costMonthCard = page.locator('[data-testid="stat-card"]:has-text("Cost This Month")');

    // Verify cost format (should have $ sign and decimal)
    const costTodayValue = await costTodayCard.locator('[data-testid="stat-value"]').textContent();
    const costMonthValue = await costMonthCard.locator('[data-testid="stat-value"]').textContent();

    expect(costTodayValue).toMatch(/^\$\d+\.\d{2}$/);
    expect(costMonthValue).toMatch(/^\$\d+\.\d{2}$/);
  });

  test("quick action buttons visible", async ({ page }) => {
    // Wait for page to load
    await expect(page.locator('[data-testid="stat-card"]').first()).toBeVisible({ timeout: 5000 });

    // Verify quick action buttons
    await expect(page.locator('button:has-text("Create Agent")')).toBeVisible();
    await expect(page.locator('button:has-text("Add Phone Number")')).toBeVisible();
  });

  test("navigation links work correctly", async ({ page }) => {
    // Wait for page to load
    await expect(page.locator('[data-testid="stat-card"]').first()).toBeVisible({ timeout: 5000 });

    // Click "Create Agent" button
    await page.click('button:has-text("Create Agent")');
    await expect(page).toHaveURL(/\/dashboard\/agents\/new/);

    // Go back
    await page.goBack();

    // Click "Add Phone Number" button
    await page.click('button:has-text("Add Phone Number")');
    await expect(page).toHaveURL(/\/dashboard\/phone-numbers/);
  });
});

import { test, expect } from "@playwright/test";

/**
 * E2E Test for User Story 1: Complete Agent Creation Flow
 * Tests the 3-step wizard from start to finish
 *
 * User Story: A new user creates their first voice agent through the 3-step wizard,
 * seeing clear feedback at every step and successfully deploying an agent.
 *
 * Independent Test: (1) Sign up, (2) Complete 3-step agent wizard, (3) Submit form,
 * (4) Verify agent appears in list.
 */

test.describe("Agent Creation Wizard", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to agents page (assumes user is already logged in)
    // In a real scenario, you'd handle authentication here
    await page.goto("/dashboard/agents");
  });

  test("user can create agent through 3-step wizard", async ({ page }) => {
    // Step 1: Navigate to wizard
    await page.click('button:has-text("Create New Agent")');
    await expect(page).toHaveURL(/\/dashboard\/agents\/new/);

    // Verify Step 1 is visible
    await expect(page.locator("text=Step 1 of 3")).toBeVisible();

    // Fill Step 1: Basic Info
    await page.fill('input[name="name"]', "Test Agent");
    await page.fill('textarea[name="description"]', "This is a test agent for automated testing");

    // Click Next
    await page.click('button:has-text("Next")');

    // Verify Step 2 is visible
    await expect(page.locator("text=Step 2 of 3")).toBeVisible();

    // Fill Step 2: Instructions & Voice
    await page.fill('textarea[name="instructions"]', "You are a helpful customer support agent");
    await page.selectOption('select[name="llm_model"]', "gpt-4o-mini");
    await page.selectOption('select[name="voice"]', "echo");

    // Click Next
    await page.click('button:has-text("Next")');

    // Verify Step 3 is visible
    await expect(page.locator("text=Step 3 of 3")).toBeVisible();

    // Step 3: Advanced Settings (default values are fine)
    // Click Create Agent button
    await page.click('button:has-text("Create Agent")');

    // Verify loading state
    await expect(page.locator('button:has-text("Creating...")').or(page.locator('button[disabled]:has-text("Create Agent")'))).toBeVisible({ timeout: 2000 });

    // Wait for success and redirect
    await expect(page).toHaveURL(/\/dashboard\/agents/, { timeout: 10000 });

    // Verify success toast
    await expect(page.locator('text=Agent created successfully')).toBeVisible({ timeout: 5000 });

    // Verify agent appears in list
    await expect(page.locator('text=Test Agent')).toBeVisible();
  });

  test("validates Step 1 required fields", async ({ page }) => {
    await page.click('button:has-text("Create New Agent")');

    // Try to proceed without filling required fields
    await page.click('button:has-text("Next")');

    // Should show validation errors
    await expect(page.locator('text=Name must be at least 3 characters')).toBeVisible();
    await expect(page.locator('text=Description must be at least 10 characters')).toBeVisible();

    // Next button should not advance (still on Step 1)
    await expect(page.locator("text=Step 1 of 3")).toBeVisible();
  });

  test("validates Step 1 field lengths", async ({ page }) => {
    await page.click('button:has-text("Create New Agent")');

    // Enter name that's too short
    await page.fill('input[name="name"]', "Te");
    await page.fill('textarea[name="description"]', "Short");

    // Trigger validation
    await page.click('button:has-text("Next")');

    // Should show validation errors
    await expect(page.locator('text=Name must be at least 3 characters')).toBeVisible();
    await expect(page.locator('text=Description must be at least 10 characters')).toBeVisible();
  });

  test("shows character counter for description field", async ({ page }) => {
    await page.click('button:has-text("Create New Agent")');

    // Type in description
    await page.fill('textarea[name="description"]', "This is a test description");

    // Check character counter is visible
    await expect(page.locator('text=/\\d+\\/500 characters/')).toBeVisible();
  });

  test("allows navigation back through steps", async ({ page }) => {
    await page.click('button:has-text("Create New Agent")');

    // Fill Step 1
    await page.fill('input[name="name"]', "Test Agent");
    await page.fill('textarea[name="description"]', "Test description");
    await page.click('button:has-text("Next")');

    // Verify Step 2
    await expect(page.locator("text=Step 2 of 3")).toBeVisible();

    // Click Back button
    await page.click('button:has-text("Back")');

    // Should be back on Step 1
    await expect(page.locator("text=Step 1 of 3")).toBeVisible();

    // Values should be preserved
    await expect(page.locator('input[name="name"]')).toHaveValue("Test Agent");
  });

  test("handles API error gracefully", async ({ page }) => {
    // Mock API to return error
    await page.route("**/api/user/agents", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: {
            message: "Failed to create agent. Please try again.",
            code: "INTERNAL_ERROR",
          },
        }),
      });
    });

    await page.click('button:has-text("Create New Agent")');

    // Fill all steps
    await page.fill('input[name="name"]', "Test Agent");
    await page.fill('textarea[name="description"]', "Test description");
    await page.click('button:has-text("Next")');

    await page.fill('textarea[name="instructions"]', "You are helpful");
    await page.click('button:has-text("Next")');

    await page.click('button:has-text("Create Agent")');

    // Should show error message
    await expect(page.locator('text=Failed to create agent')).toBeVisible({ timeout: 5000 });

    // Should show Retry button
    await expect(page.locator('button:has-text("Retry")')).toBeVisible();
  });

  test("disables submit button during submission", async ({ page }) => {
    await page.click('button:has-text("Create New Agent")');

    // Fill all steps quickly
    await page.fill('input[name="name"]', "Test Agent");
    await page.fill('textarea[name="description"]', "Test description for automated test");
    await page.click('button:has-text("Next")');

    await page.fill('textarea[name="instructions"]', "You are a helpful assistant");
    await page.click('button:has-text("Next")');

    // Click submit
    await page.click('button:has-text("Create Agent")');

    // Button should be disabled immediately
    await expect(page.locator('button[disabled]:has-text("Create Agent")')).toBeVisible({ timeout: 1000 });
  });
});

test.describe("Agent List Page", () => {
  test("shows empty state when no agents exist", async ({ page }) => {
    // Mock empty agents response
    await page.route("**/api/user/agents", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [],
        }),
      });
    });

    await page.goto("/dashboard/agents");

    // Should show empty state
    await expect(page.locator('text=No agents yet')).toBeVisible();
    await expect(page.locator('text=Create your first agent')).toBeVisible();
    await expect(page.locator('button:has-text("Create Agent")')).toBeVisible();
  });

  test("displays skeleton loaders while loading", async ({ page }) => {
    // Delay the API response
    await page.route("**/api/user/agents", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [],
        }),
      });
    });

    await page.goto("/dashboard/agents");

    // Should show skeleton loaders
    await expect(page.locator('[class*="skeleton"]')).toBeVisible({ timeout: 500 });
  });

  test("confirms before deleting agent", async ({ page }) => {
    // Mock agents list
    await page.route("**/api/user/agents", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: "test-id-123",
              name: "Test Agent",
              description: "Test",
              status: "active",
            },
          ],
        }),
      });
    });

    await page.goto("/dashboard/agents");

    // Click delete button
    await page.click('button[aria-label="Delete agent"]');

    // Should show confirmation dialog
    await expect(page.locator('text=Delete Agent')).toBeVisible();
    await expect(page.locator('text=This action cannot be undone')).toBeVisible();

    // Should have Cancel and Confirm buttons
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    await expect(page.locator('button:has-text("Delete")').or(page.locator('button:has-text("Confirm")'))).toBeVisible();
  });
});

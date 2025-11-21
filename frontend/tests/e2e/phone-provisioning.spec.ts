/**
 * E2E Test: Phone Number Provisioning & Assignment (T030)
 * Tests User Story 2 - Phone provisioning flow
 *
 * Test scenarios:
 * 1. User can provision new phone number
 * 2. User can assign phone to agent
 * 3. User can unassign phone from agent
 * 4. User can delete unassigned phone
 * 5. Validation errors prevent invalid provisioning
 * 6. Loading states displayed during async operations
 * 7. Success toasts shown on completion
 * 8. Error states handled with retry options
 */

import { test, expect } from "@playwright/test";

test.describe("Phone Number Provisioning & Assignment", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard and login
    await page.goto("/dashboard/phone-numbers");
    await expect(page).toHaveURL(/\/dashboard\/phone-numbers/);
  });

  test("user can provision new phone number", async ({ page }) => {
    // Open provision modal
    await page.click('button:has-text("Add Phone Number")');
    await expect(page.locator('text=Provision Phone Number')).toBeVisible();

    // Fill provision form
    await page.selectOption('select[name="country_code"]', "US");
    await page.fill('input[name="area_code"]', "415");

    // Submit
    await page.click('button:has-text("Provision")');

    // Wait for success toast
    await expect(page.locator('text=Phone number provisioned')).toBeVisible();

    // Verify modal closed
    await expect(page.locator('text=Provision Phone Number')).not.toBeVisible();

    // Verify phone appears in list
    await expect(page.locator('text=+1 (415)')).toBeVisible();
  });

  test("user can assign phone to agent", async ({ page }) => {
    // Find unassigned phone number card
    const phoneCard = page.locator('[data-testid="phone-card"]').first();
    await expect(phoneCard).toBeVisible();

    // Open assign modal
    await phoneCard.locator('button:has-text("Assign to Agent")').click();
    await expect(page.locator('text=Assign Phone Number')).toBeVisible();

    // Select agent from dropdown
    await page.selectOption('select[name="agent_id"]', { index: 1 });

    // Submit
    await page.click('button:has-text("Assign")');

    // Wait for success toast
    await expect(page.locator('text=Phone assigned successfully')).toBeVisible();

    // Verify phone shows assigned status
    await expect(phoneCard.locator('text=Active')).toBeVisible();
  });

  test("user can unassign phone from agent", async ({ page }) => {
    // Find assigned phone number card
    const assignedCard = page.locator('[data-testid="phone-card"]:has-text("Active")').first();
    await expect(assignedCard).toBeVisible();

    // Open unassign confirmation
    await assignedCard.locator('button:has-text("Unassign")').click();
    await expect(page.locator('text=Unassign Phone Number')).toBeVisible();

    // Confirm unassignment
    await page.click('button:has-text("Confirm")');

    // Wait for success toast
    await expect(page.locator('text=Phone unassigned')).toBeVisible();

    // Verify phone shows unassigned status
    await expect(assignedCard.locator('text=Available')).toBeVisible();
  });

  test("user can delete unassigned phone", async ({ page }) => {
    // Find available phone card
    const availableCard = page.locator('[data-testid="phone-card"]:has-text("Available")').first();
    const phoneNumber = await availableCard.locator('[data-testid="phone-number"]').textContent();

    // Open delete confirmation
    await availableCard.locator('button:has-text("Delete")').click();
    await expect(page.locator('text=Delete Phone Number')).toBeVisible();
    await expect(page.locator(`text=${phoneNumber}`)).toBeVisible();

    // Confirm deletion
    await page.click('button:has-text("Delete")');

    // Wait for success toast
    await expect(page.locator('text=Phone number deleted')).toBeVisible();

    // Verify phone removed from list
    await expect(page.locator(`text=${phoneNumber}`)).not.toBeVisible();
  });

  test("cannot delete assigned phone number", async ({ page }) => {
    // Find assigned phone card
    const assignedCard = page.locator('[data-testid="phone-card"]:has-text("Active")').first();
    await expect(assignedCard).toBeVisible();

    // Delete button should be disabled
    const deleteButton = assignedCard.locator('button:has-text("Delete")');
    await expect(deleteButton).toBeDisabled();
  });

  test("validation errors prevent invalid provisioning", async ({ page }) => {
    // Open provision modal
    await page.click('button:has-text("Add Phone Number")');

    // Try to submit without selecting country
    await page.click('button:has-text("Provision")');

    // Verify validation error
    await expect(page.locator('text=Country code is required')).toBeVisible();

    // Enter invalid area code
    await page.selectOption('select[name="country_code"]', "US");
    await page.fill('input[name="area_code"]', "99");
    await page.click('button:has-text("Provision")');

    // Verify validation error
    await expect(page.locator('text=Area code must be 3 digits')).toBeVisible();
  });

  test("loading states displayed during provisioning", async ({ page }) => {
    // Open provision modal
    await page.click('button:has-text("Add Phone Number")');

    // Fill form
    await page.selectOption('select[name="country_code"]', "US");
    await page.fill('input[name="area_code"]', "415");

    // Submit and check loading state
    await page.click('button:has-text("Provision")');
    await expect(page.locator('button:has-text("Provisioning...")')).toBeVisible();

    // Wait for completion
    await expect(page.locator('text=Phone number provisioned')).toBeVisible();
  });

  test("error states handled with retry", async ({ page }) => {
    // Mock API error
    await page.route("**/api/user/phone-numbers", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: {
            code: "MAGNUS_UNAVAILABLE",
            message: "Magnus Billing service is temporarily unavailable",
          },
        }),
      });
    });

    // Open provision modal
    await page.click('button:has-text("Add Phone Number")');
    await page.selectOption('select[name="country_code"]', "US");
    await page.click('button:has-text("Provision")');

    // Verify error message
    await expect(page.locator('text=Magnus Billing service is temporarily unavailable')).toBeVisible();

    // Verify retry button
    await expect(page.locator('button:has-text("Retry")')).toBeVisible();
  });

  test("displays empty state when no phone numbers", async ({ page }) => {
    // Mock empty response
    await page.route("**/api/user/phone-numbers", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.reload();

    // Verify empty state
    await expect(page.locator('text=No phone numbers yet')).toBeVisible();
    await expect(page.locator('text=Add your first phone number to start receiving calls')).toBeVisible();
    await expect(page.locator('button:has-text("Add Phone Number")')).toBeVisible();
  });

  test("displays skeleton loaders while loading", async ({ page }) => {
    // Mock slow API response
    await page.route("**/api/user/phone-numbers", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      route.continue();
    });

    await page.reload();

    // Verify skeleton loaders
    await expect(page.locator('[data-testid="skeleton-loader"]')).toBeVisible();

    // Wait for data to load
    await expect(page.locator('[data-testid="phone-card"]')).toBeVisible({ timeout: 3000 });
  });
});

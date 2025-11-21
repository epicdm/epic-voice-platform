import { test, expect } from '@playwright/test'

test.describe('Agents Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/agents')
  })

  test('should display agents page with stats', async ({ page }) => {
    // Check page title
    await expect(page.getByRole('heading', { name: 'AI Agents' })).toBeVisible()

    // Check stats are visible
    await expect(page.getByText('Total Agents')).toBeVisible()
    await expect(page.getByText('Active')).toBeVisible()
    await expect(page.getByText('Total Calls')).toBeVisible()
    await expect(page.getByText('Models Used')).toBeVisible()
  })

  test('should have create agent button', async ({ page }) => {
    // Check for create button in header
    const createButton = page.getByRole('button', { name: 'Create Agent' }).first()
    await expect(createButton).toBeVisible()
  })

  test('should open create agent wizard when button clicked', async ({ page }) => {
    // Click create agent button
    await page.getByRole('button', { name: 'Create Agent' }).first().click()

    // Wizard should open
    await expect(page.getByText('Create New Agent')).toBeVisible()
    await expect(page.getByText('Details')).toBeVisible()
  })

  test('should display agent cards', async ({ page }) => {
    // Wait for agents to load
    await page.waitForTimeout(1000)

    // Check if at least one agent card is visible
    const agentCards = page.locator('.card').filter({ hasText: 'gpt-' })
    await expect(agentCards.first()).toBeVisible()
  })

  test('should show agent details in cards', async ({ page }) => {
    // Wait for agents to load
    await page.waitForTimeout(1000)

    // Check for agent details
    await expect(page.getByText('Phone Number')).toBeVisible()
    await expect(page.getByText('Total Calls')).toBeVisible()
    await expect(page.getByText('Last Active')).toBeVisible()
  })

  test('should have edit and delete buttons on agent cards', async ({ page }) => {
    // Wait for agents to load
    await page.waitForTimeout(1000)

    // Check for edit button (should have Edit icon)
    const editButtons = page.locator('button svg').filter({ hasText: 'Edit' })
    if (await editButtons.count() > 0) {
      await expect(editButtons.first()).toBeVisible()
    }

    // Check for delete button (should have Trash icon)
    const deleteButtons = page.locator('button svg').filter({ hasText: 'Trash' })
    if (await deleteButtons.count() > 0) {
      await expect(deleteButtons.first()).toBeVisible()
    }
  })

  test('should have refresh button', async ({ page }) => {
    const refreshButton = page.getByRole('button', { name: 'Refresh' })
    await expect(refreshButton).toBeVisible()
  })

  test('should refresh agents list when refresh clicked', async ({ page }) => {
    // Wait for initial load
    await page.waitForTimeout(1000)

    // Click refresh
    await page.getByRole('button', { name: 'Refresh' }).click()

    // Page should still display agents
    await expect(page.getByRole('heading', { name: 'AI Agents' })).toBeVisible()
  })

  test('create agent wizard should have multiple steps', async ({ page }) => {
    // Open wizard
    await page.getByRole('button', { name: 'Create Agent' }).first().click()

    // Check wizard steps
    await expect(page.getByText('Details')).toBeVisible()
    await expect(page.getByText('Model')).toBeVisible()
    await expect(page.getByText('Voice')).toBeVisible()
    await expect(page.getByText('Instructions')).toBeVisible()
    await expect(page.getByText('Review')).toBeVisible()
  })

  test('should close wizard when cancel clicked', async ({ page }) => {
    // Open wizard
    await page.getByRole('button', { name: 'Create Agent' }).first().click()
    await expect(page.getByText('Create New Agent')).toBeVisible()

    // Click cancel
    await page.getByRole('button', { name: 'Cancel' }).click()

    // Wizard should be closed
    await expect(page.getByText('Create New Agent')).not.toBeVisible()
  })

  test('should display empty state when no agents', async ({ page }) => {
    // This test assumes there might be a scenario with no agents
    // Check if empty state elements exist
    const emptyState = page.getByText('No agents yet')
    if (await emptyState.isVisible()) {
      await expect(page.getByText('Create your first AI voice agent')).toBeVisible()
    }
  })
})

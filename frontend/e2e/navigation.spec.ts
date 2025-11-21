import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('should navigate between all pages', async ({ page }) => {
    // Start at dashboard
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    // Navigate to Agents
    await page.getByRole('link', { name: 'Agents' }).click()
    await expect(page).toHaveURL('/agents')
    await expect(page.getByRole('heading', { name: 'AI Agents' })).toBeVisible()

    // Navigate to Voice Call
    await page.getByRole('link', { name: 'Voice Call' }).click()
    await expect(page).toHaveURL('/voice')
    await expect(page.getByRole('heading', { name: 'Voice Chat' })).toBeVisible()

    // Navigate to Call Logs
    await page.getByRole('link', { name: 'Call Logs' }).click()
    await expect(page).toHaveURL('/calls')
    await expect(page.getByRole('heading', { name: 'Call Logs' })).toBeVisible()

    // Navigate to Analytics
    await page.getByRole('link', { name: 'Analytics' }).click()
    await expect(page).toHaveURL('/analytics')
    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible()

    // Navigate to Settings
    await page.getByRole('link', { name: 'Settings' }).click()
    await expect(page).toHaveURL('/settings')
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

    // Navigate back to Dashboard
    await page.getByRole('link', { name: 'Dashboard' }).click()
    await expect(page).toHaveURL('/dashboard')
  })

  test('should highlight active navigation item', async ({ page }) => {
    // Go to agents page
    await page.goto('/agents')

    // Agents link should be highlighted
    const agentsLink = page.getByRole('link', { name: 'Agents' })
    await expect(agentsLink).toHaveClass(/bg-epic-primary/)

    // Other links should not be highlighted
    const dashboardLink = page.getByRole('link', { name: 'Dashboard' })
    await expect(dashboardLink).not.toHaveClass(/bg-epic-primary/)
  })

  test('should display logo and branding', async ({ page }) => {
    await page.goto('/dashboard')

    // Check for Epic.ai branding
    await expect(page.getByText('Epic.ai')).toBeVisible()
  })

  test('should display user profile in sidebar', async ({ page }) => {
    await page.goto('/dashboard')

    // Check for user profile
    await expect(page.getByText('John Doe')).toBeVisible()
    await expect(page.getByText('john@epic.ai')).toBeVisible()
  })
})

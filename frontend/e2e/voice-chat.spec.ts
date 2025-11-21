import { test, expect } from '@playwright/test'

test.describe('Voice Chat Interface', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to voice page
    await page.goto('/voice')
  })

  test('should display voice chat page with all elements', async ({ page }) => {
    // Check page title
    await expect(page.getByRole('heading', { name: 'Voice Chat' })).toBeVisible()

    // Check main components are visible
    await expect(page.getByText('Select Agent')).toBeVisible()
    await expect(page.getByText('Connection Info')).toBeVisible()
    await expect(page.getByText('Quick Tips')).toBeVisible()
  })

  test('should display agent selection cards', async ({ page }) => {
    // Wait for agents to load
    await page.waitForTimeout(1000)

    // Check if agent cards are rendered
    const agentCards = page.locator('button:has-text("gpt-")')
    await expect(agentCards.first()).toBeVisible()
  })

  test('should be able to select an agent', async ({ page }) => {
    // Wait for agents to load
    await page.waitForTimeout(1000)

    // Click on first agent
    const firstAgent = page.locator('button').filter({ hasText: 'gpt-' }).first()
    await firstAgent.click()

    // Check if agent is selected (has indigo border)
    await expect(firstAgent).toHaveClass(/border-indigo-500/)
  })

  test('should have visualizer style toggle buttons', async ({ page }) => {
    // Check visualizer style buttons
    await expect(page.getByRole('button', { name: 'Linear' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Circular' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Pulse' })).toBeVisible()
  })

  test('should switch visualizer styles', async ({ page }) => {
    // Default is circular
    await expect(page.getByRole('button', { name: 'Circular' })).toHaveClass(/bg-indigo-600/)

    // Switch to linear
    await page.getByRole('button', { name: 'Linear' }).click()
    await expect(page.getByRole('button', { name: 'Linear' })).toHaveClass(/bg-indigo-600/)

    // Switch to pulse
    await page.getByRole('button', { name: 'Pulse' }).click()
    await expect(page.getByRole('button', { name: 'Pulse' })).toHaveClass(/bg-indigo-600/)
  })

  test('should display bot avatar', async ({ page }) => {
    // Bot avatar should be visible (check for the Bot icon)
    const botAvatar = page.locator('svg').filter({ hasText: 'Bot' }).first()
    await expect(botAvatar).toBeVisible()
  })

  test('should have microphone and call control buttons', async ({ page }) => {
    // Check for control buttons
    await expect(page.getByRole('button', { name: /Unmute|Mute/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Start Call|End Call/ })).toBeVisible()
  })

  test('microphone button should be disabled when not connected', async ({ page }) => {
    // Microphone button should be disabled initially
    const micButton = page.getByRole('button', { name: /Unmute|Mute/ })
    await expect(micButton).toBeDisabled()
  })

  test('should display connection info sidebar', async ({ page }) => {
    // Check connection info
    await expect(page.getByText('Connection Info')).toBeVisible()
    await expect(page.getByText('Status')).toBeVisible()
    await expect(page.getByText('Disconnected')).toBeVisible()
    await expect(page.getByText('Room')).toBeVisible()
    await expect(page.getByText('Microphone')).toBeVisible()
    await expect(page.getByText('Audio Level')).toBeVisible()
  })

  test('should display agent details sidebar when agent selected', async ({ page }) => {
    // Wait for agents to load
    await page.waitForTimeout(1000)

    // Check agent details
    await expect(page.getByText('Agent Details')).toBeVisible()
    await expect(page.getByText('Model')).toBeVisible()
    await expect(page.getByText('Voice')).toBeVisible()
    await expect(page.getByText('Language')).toBeVisible()
  })

  test('should display quick tips', async ({ page }) => {
    // Check quick tips
    await expect(page.getByText('Quick Tips')).toBeVisible()
    await expect(page.getByText(/Enable your microphone before starting/)).toBeVisible()
  })

  test('should show connecting state when start call clicked', async ({ page, context }) => {
    // Grant microphone permissions
    await context.grantPermissions(['microphone'])

    // Wait for agents to load
    await page.waitForTimeout(1000)

    // Click start call
    const startButton = page.getByRole('button', { name: 'Start Call' })
    await startButton.click()

    // Should show connecting state
    await expect(page.getByText('Connecting...')).toBeVisible()
  })

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    // Check if page is still functional
    await expect(page.getByRole('heading', { name: 'Voice Chat' })).toBeVisible()
    await expect(page.getByText('Select Agent')).toBeVisible()
  })

  test('should navigate from sidebar to voice page', async ({ page }) => {
    // Navigate to dashboard first
    await page.goto('/dashboard')

    // Click on Voice Call in sidebar
    await page.getByRole('link', { name: 'Voice Call' }).click()

    // Should be on voice page
    await expect(page).toHaveURL('/voice')
    await expect(page.getByRole('heading', { name: 'Voice Chat' })).toBeVisible()
  })
})

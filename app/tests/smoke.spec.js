import { test, expect } from '@playwright/test';

test('home page loads with release number', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('footer')).toContainText(/Release \d+\.\d+\.\d+/);
});

test('quote calculator shows a total', async ({ page }) => {
  await page.goto('./#/quote');
  const button = page.getByRole('button', { name: /quote/i });
  await expect(button).toBeVisible();
  await button.click();
  await expect(page.locator('.result')).toContainText('Total');
});

test('login page loads', async ({ page }) => {
  await page.goto('./#/login');
  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
});

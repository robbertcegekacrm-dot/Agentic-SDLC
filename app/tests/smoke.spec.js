import { test, expect } from '@playwright/test';
import { calculateQuote, formatEuro } from '../src/quote.js';

test('home page loads with hero and release number', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: /calculate your quote/i }).first()).toBeVisible();
  await expect(page.locator('footer')).toContainText(/Release \d+\.\d+\.\d+/);
});

test('main navigation reaches every page', async ({ page }) => {
  await page.goto('./');
  const nav = page.getByRole('navigation', { name: 'Main' });
  await nav.getByRole('link', { name: 'Solutions' }).click();
  await expect(page.locator('#solutions')).toBeInViewport();
  await nav.getByRole('link', { name: 'Projects' }).click();
  await expect(page.locator('#projects')).toBeInViewport();
  await nav.getByRole('link', { name: 'Quote calculator' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/quote/i);
});

test('quote calculator shows a live total', async ({ page }) => {
  await page.goto('./#/quote');
  const summary = page.locator('.result');
  await expect(summary).toContainText('Total');
  const vat = summary.locator('.line').filter({ hasText: 'VAT (21%)' });
  await expect(vat.locator('span').nth(1)).toHaveText(formatEuro(calculateQuote({ product: 'panel', quantity: 10 }).vat));
  const before = await summary.locator('.total').textContent();
  await page.getByRole('button', { name: 'Increase quantity' }).click();
  await expect(summary.locator('.total')).not.toHaveText(before);
  const button = page.getByRole('button', { name: /quote/i });
  await expect(button).toBeVisible();
  await button.click();
  await expect(page.getByText('Thank you!')).toBeVisible();
});

test('login page loads', async ({ page }) => {
  await page.goto('./#/login');
  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
});

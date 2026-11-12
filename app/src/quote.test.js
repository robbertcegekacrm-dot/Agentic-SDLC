import { describe, it, expect } from 'vitest';
import { PRODUCTS, VAT_RATE, calculateQuote } from './quote.js';

describe('calculateQuote', () => {
  it('calculates the subtotal from price and quantity', () => {
    const q = calculateQuote({ product: 'panel', quantity: 10 });
    expect(q.subtotal).toBe(2100);
  });

  it('adds VAT on top of the subtotal', () => {
    const q = calculateQuote({ product: 'inverter', quantity: 2 });
    expect(q.vat).toBeCloseTo(q.subtotal * VAT_RATE, 2);
    expect(q.total).toBeCloseTo(q.subtotal * (1 + VAT_RATE), 2);
  });

  it('uses a VAT rate between 0 and 1', () => {
    expect(VAT_RATE).toBeGreaterThan(0);
    expect(VAT_RATE).toBeLessThan(1);
  });

  // When changing the VAT rule, add a test here that asserts the expected rate and amounts.

  it('treats invalid quantities as zero', () => {
    expect(calculateQuote({ product: 'battery', quantity: 'abc' }).total).toBe(0);
  });

  it('rejects unknown products', () => {
    expect(() => calculateQuote({ product: 'windmill', quantity: 1 })).toThrow();
  });

  it('has a price for every product', () => {
    PRODUCTS.forEach((p) => expect(p.price).toBeGreaterThan(0));
  });
});

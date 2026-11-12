export const VAT_RATE = 0.12;

export const PRODUCTS = [
  { id: 'panel', name: 'Solar panel 430 Wp', price: 210 },
  { id: 'inverter', name: 'Inverter 5 kW', price: 1150 },
  { id: 'battery', name: 'Home battery 10 kWh', price: 4800 },
  { id: 'install', name: 'Installation per panel', price: 65 },
];

const round = (n) => Math.round(n * 100) / 100;

export function calculateQuote({ product, quantity }) {
  const item = PRODUCTS.find((p) => p.id === product);
  if (!item) throw new Error(`Unknown product: ${product}`);
  const qty = Math.max(0, Math.floor(Number(quantity) || 0));
  const subtotal = round(item.price * qty);
  const vat = round(subtotal * VAT_RATE);
  return { product: item, quantity: qty, subtotal, vat, total: round(subtotal + vat) };
}

export function formatEuro(amount) {
  return new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(amount);
}

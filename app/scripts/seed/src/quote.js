export const VAT_RATE = 0.12;

export const PRODUCTS = [
  { id: 'panel', name: 'Solar panel 430 Wp', price: 210, unit: 'per panel', icon: 'panel', blurb: 'Full-black monocrystalline panel, 25-year product warranty.' },
  { id: 'inverter', name: 'Inverter 5 kW', price: 1150, unit: 'per unit', icon: 'inverter', blurb: 'Hybrid inverter, ready for a home battery.' },
  { id: 'battery', name: 'Home battery 10 kWh', price: 4800, unit: 'per unit', icon: 'battery', blurb: 'Store daytime energy and use it in the evening.' },
  { id: 'charger', name: 'EV charger 11 kW', price: 1290, unit: 'per unit', icon: 'charger', blurb: 'Smart wallbox that charges on your own solar power.' },
];

export const EXTRAS = [
  { id: 'install', name: 'Professional installation', price: 65, perUnit: true, blurb: 'Certified installers, AREI inspection included.' },
  { id: 'monitoring', name: 'Smart monitoring app', price: 149, perUnit: false, blurb: 'Follow production and savings in real time.' },
  { id: 'warranty', name: 'Extended warranty (+10 years)', price: 249, perUnit: false, blurb: 'Labour and parts covered for 10 extra years.' },
];

const round = (n) => Math.round(n * 100) / 100;

export function calculateQuote({ product, quantity, extras = [] }) {
  const item = PRODUCTS.find((p) => p.id === product);
  if (!item) throw new Error(`Unknown product: ${product}`);
  const qty = Math.max(0, Math.floor(Number(quantity) || 0));
  const lines = [{ name: `${qty} × ${item.name}`, amount: round(item.price * qty) }];
  EXTRAS.filter((e) => extras.includes(e.id)).forEach((e) => {
    const amount = round(e.perUnit ? e.price * qty : e.price);
    lines.push({ name: e.perUnit ? `${e.name} (${qty} ×)` : e.name, amount });
  });
  const subtotal = round(lines.reduce((sum, l) => sum + l.amount, 0));
  const vat = round(subtotal * VAT_RATE);
  return { product: item, quantity: qty, lines, subtotal, vat, total: round(subtotal + vat) };
}

export function formatEuro(amount) {
  return new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(amount);
}

import './style.css';
import { PRODUCTS, VAT_RATE, calculateQuote, formatEuro } from './quote.js';
import { getSession, login, logout } from './session.js';

const app = document.getElementById('app');
document.getElementById('version').textContent = `Release ${__APP_VERSION__}`;

const MY_QUOTES = [
  { ref: 'Q-2041', item: '12 × Solar panel 430 Wp', total: 3049.2 },
  { ref: 'Q-2057', item: '1 × Home battery 10 kWh', total: 5808 },
];

function myQuotes() {
  const session = getSession();
  if (!session) return '<p>Log in to see your quotes.</p>';
  if (session.expired) {
    return '<p class="alert">Your session has expired. Please log in again.</p>';
  }
  const rows = MY_QUOTES.map(
    (q) => `<li><strong>${q.ref}</strong> ${q.item} <span>${formatEuro(q.total)}</span></li>`
  ).join('');
  return `<p>Logged in as ${session.email}</p><ul class="quotes">${rows}</ul>`;
}

function home() {
  return `
    <section class="hero">
      <h1>Solar energy for your home in Limburg</h1>
      <p>PowerStudios designs and installs solar panels, inverters and home batteries from Hasselt.</p>
      <a class="button" href="#/quote">Calculate your quote</a>
    </section>
    <section class="card"><h2>My quotes</h2>${myQuotes()}</section>`;
}

function quote() {
  const options = PRODUCTS.map(
    (p) => `<option value="${p.id}">${p.name} (${formatEuro(p.price)})</option>`
  ).join('');
  return `
    <section class="card">
      <h1>Quote calculator</h1>
      <form id="quote-form">
        <label>Product <select name="product">${options}</select></label>
        <label>Quantity <input name="quantity" type="number" min="1" value="1" /></label>
        <button type="submit" class="button">Requets quote</button>
      </form>
      <div id="result"></div>
    </section>`;
}

function showQuote(form) {
  const data = new FormData(form);
  const q = calculateQuote({ product: data.get('product'), quantity: data.get('quantity') });
  document.getElementById('result').innerHTML = `
    <table class="result">
      <tr><td>${q.quantity} × ${q.product.name}</td><td>${formatEuro(q.subtotal)}</td></tr>
      <tr><td>VAT ${Math.round(VAT_RATE * 100)}%</td><td>${formatEuro(q.vat)}</td></tr>
      <tr class="total"><td>Total</td><td>${formatEuro(q.total)}</td></tr>
    </table>`;
}

function loginPage() {
  const session = getSession();
  const form = session
    ? '<button id="logout" class="button secondary">Log out</button>'
    : `<form id="login-form">
        <label>Email <input name="email" type="email" required /></label>
        <label>Password <input name="password" type="password" required /></label>
        <button type="submit" class="button">Log in</button>
      </form>`;
  return `
    <section class="card"><h1>Login</h1>${form}</section>
    <section class="card"><h2>My quotes</h2>${myQuotes()}</section>`;
}

const routes = { '/': home, '/quote': quote, '/login': loginPage };

function render() {
  const path = location.hash.replace(/^#/, '') || '/';
  app.innerHTML = (routes[path] || home)();
}

app.addEventListener('submit', (event) => {
  event.preventDefault();
  if (event.target.id === 'quote-form') showQuote(event.target);
  if (event.target.id === 'login-form') {
    login(new FormData(event.target).get('email'));
    render();
  }
});

app.addEventListener('click', (event) => {
  if (event.target.id === 'logout') {
    logout();
    render();
  }
});

window.addEventListener('hashchange', render);
render();

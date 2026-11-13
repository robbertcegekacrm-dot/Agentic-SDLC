import './style.css';
import { PRODUCTS, EXTRAS, calculateQuote, formatEuro } from './quote.js';
import { getSession, login, logout } from './session.js';
import { icon, logo } from './icons.js';
import { STATS, SOLUTIONS, STEPS, PROJECTS, TESTIMONIALS, FAQ } from './content.js';

const app = document.getElementById('app');
const header = document.getElementById('site-header');
const media = (file) => `${import.meta.env.BASE_URL}media/${file}`;

document.getElementById('version').textContent = `Release ${__APP_VERSION__}`;
document.getElementById('logo').innerHTML = logo();
document.getElementById('footer-logo').innerHTML = logo();
document.getElementById('nav-toggle').innerHTML = icon('menu');

const MY_QUOTES = [
  { ref: 'Q-2041', item: '12 × Solar panel 430 Wp', total: 3049.2 },
  { ref: 'Q-2057', item: '1 × Home battery 10 kWh', total: 5808 },
];

// ---------- Home ----------
function sectionHead(eyebrow, title, text = '') {
  return `<div class="section-head"><span class="eyebrow">${eyebrow}</span><h2>${title}</h2>${text ? `<p>${text}</p>` : ''}</div>`;
}

function home() {
  const stars = Array.from({ length: 5 }, () => icon('star', 'icon star')).join('');
  return `
    <section class="hero">
      <picture class="hero-media">
        <source type="image/webp" srcset="${media('background_solar.webp')}" />
        <img src="${media('background_solar.jpg')}" alt="" fetchpriority="high" />
      </picture>
      <div class="container hero-content">
        <span class="hero-badge">${icon('sun')} Hasselt · Limburg · since 2011</span>
        <h1>Solar energy for your home in Limburg</h1>
        <p class="hero-lead">PowerStudios designs, installs and maintains solar panels, home batteries and EV chargers. One local team, from first quote to lifelong monitoring.</p>
        <div class="hero-actions">
          <a class="btn btn-primary btn-lg" href="#/quote">Calculate your quote ${icon('arrow')}</a>
          <a class="btn btn-ghost btn-lg" href="#/solutions">Our solutions</a>
        </div>
        <p class="trust"><span class="stars">${stars}</span> <strong>4.8/5</strong> from 1,200+ customers</p>
      </div>
    </section>

    <section class="stats" aria-label="PowerStudios in numbers">
      <div class="container stats-grid">
        ${STATS.map((s) => `<div class="stat"><strong>${s.value}</strong><span>${s.label}</span></div>`).join('')}
      </div>
    </section>

    <section class="section" id="solutions">
      <div class="container">
        ${sectionHead('Solutions', 'Everything for your own clean energy', 'Combine the building blocks you need today and extend later. Every system is designed for your roof and your consumption.')}
        <div class="card-grid four">
          ${SOLUTIONS.map((s) => `
            <article class="card solution">
              <span class="icon-tile">${icon(s.icon)}</span>
              <h3>${s.title}</h3>
              <p>${s.text}</p>
              <a class="text-link" href="#/quote">Calculate price ${icon('arrow')}</a>
            </article>`).join('')}
        </div>
      </div>
    </section>

    <section class="section section-alt">
      <div class="container">
        ${sectionHead('How it works', 'From quote to sunshine in four steps')}
        <ol class="steps">
          ${STEPS.map((s, i) => `
            <li class="step">
              <span class="step-num">${i + 1}</span>
              <span class="icon-tile soft">${icon(s.icon)}</span>
              <h3>${s.title}</h3>
              <p>${s.text}</p>
            </li>`).join('')}
        </ol>
      </div>
    </section>

    <section class="section" id="projects">
      <div class="container">
        ${sectionHead('Recent projects', 'Installed by us, all over Limburg')}
        <div class="card-grid three">
          ${PROJECTS.map((p) => `
            <article class="card project">
              <div class="project-visual tone-${p.tone}">${icon('panel', 'icon project-icon')}<span class="project-kwp">${p.kwp}</span></div>
              <div class="project-body">
                <p class="project-loc">${icon('pin')} ${p.location}</p>
                <h3>${p.type}</h3>
                <p class="muted">${p.detail}</p>
                <dl class="project-facts">
                  <div><dt>Power</dt><dd>${p.kwp}</dd></div>
                  <div><dt>Yearly savings</dt><dd>${p.savings}</dd></div>
                </dl>
              </div>
            </article>`).join('')}
        </div>
      </div>
    </section>

    <section class="section section-alt">
      <div class="container">
        ${sectionHead('Testimonials', 'What our customers say')}
        <div class="card-grid three">
          ${TESTIMONIALS.map((t) => `
            <figure class="card testimonial">
              <span class="stars">${stars}</span>
              <blockquote>“${t.text}”</blockquote>
              <figcaption><span class="avatar">${t.name[0]}</span><span><strong>${t.name}</strong><br /><span class="muted">${t.town}</span></span></figcaption>
            </figure>`).join('')}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container narrow">
        ${sectionHead('FAQ', 'Frequently asked questions')}
        <div class="faq">
          ${FAQ.map((f, i) => `
            <details class="faq-item"${i === 0 ? ' open' : ''}>
              <summary>${f.q}<span class="faq-icon">${icon('plus')}</span></summary>
              <p>${f.a}</p>
            </details>`).join('')}
        </div>
      </div>
    </section>

    ${ctaBand()}`;
}

function ctaBand() {
  return `
    <section class="cta-band">
      <div class="container cta-inner">
        <div>
          <h2>Ready to save on energy?</h2>
          <p>Get an indicative price in two minutes. A site visit and the final quote are free.</p>
        </div>
        <a class="btn btn-primary btn-lg" href="#/quote">Calculate your quote ${icon('arrow')}</a>
      </div>
    </section>`;
}

// ---------- Quote calculator ----------
function pageHero(eyebrow, title, text) {
  return `<section class="page-hero"><div class="container"><span class="eyebrow light">${eyebrow}</span><h1>${title}</h1><p>${text}</p></div></section>`;
}

function quote() {
  const products = PRODUCTS.map((p, i) => `
    <label class="choice">
      <input type="radio" name="product" value="${p.id}"${i === 0 ? ' checked' : ''} />
      <span class="choice-body">
        <span class="icon-tile">${icon(p.icon)}</span>
        <span class="choice-text"><strong>${p.name}</strong><small>${p.blurb}</small></span>
        <span class="choice-price">${formatEuro(p.price)}<small>${p.unit}</small></span>
      </span>
    </label>`).join('');
  const extras = EXTRAS.map((e) => `
    <label class="extra">
      <input type="checkbox" name="extras" value="${e.id}" />
      <span class="extra-check">${icon('check')}</span>
      <span class="choice-text"><strong>${e.name}</strong><small>${e.blurb}</small></span>
      <span class="extra-price">${formatEuro(e.price)}${e.perUnit ? '<small>per unit</small>' : ''}</span>
    </label>`).join('');
  return `
    ${pageHero('Quote calculator', 'Calculate your solar quote', 'Choose your product, quantity and extras. Your indicative price updates instantly.')}
    <section class="section tight">
      <form id="quote-form" class="container quote-layout" novalidate>
        <div class="quote-options">
          <fieldset class="panel">
            <legend><span class="step-num small">1</span> Choose a product</legend>
            <div class="choices">${products}</div>
          </fieldset>
          <fieldset class="panel">
            <legend><span class="step-num small">2</span> Quantity</legend>
            <div class="qty">
              <button type="button" class="qty-btn" data-step="-1" aria-label="Decrease quantity">${icon('minus')}</button>
              <input id="quantity" name="quantity" type="number" min="1" max="200" value="10" aria-label="Quantity" />
              <button type="button" class="qty-btn" data-step="1" aria-label="Increase quantity">${icon('plus')}</button>
            </div>
            <p class="muted small">Tip: an average home in Limburg needs 10 to 16 panels.</p>
          </fieldset>
          <fieldset class="panel">
            <legend><span class="step-num small">3</span> Optional extras</legend>
            <div class="extras">${extras}</div>
          </fieldset>
        </div>
        <aside class="quote-summary" aria-live="polite">
          <div class="summary-card" id="result"></div>
        </aside>
      </form>
    </section>`;
}

function readQuoteForm(form) {
  const data = new FormData(form);
  return calculateQuote({ product: data.get('product'), quantity: data.get('quantity'), extras: data.getAll('extras') });
}

function renderSummary(form, sent = false) {
  const q = readQuoteForm(form);
  const lines = q.lines.map((l) => `<div class="line"><span>${l.name}</span><span>${formatEuro(l.amount)}</span></div>`).join('');
  const footer = sent
    ? `<div class="sent">${icon('check')}<div><strong>Thank you!</strong><p>Your request is in. An advisor will contact you within two working days to plan the site visit.</p></div></div>`
    : `<button type="submit" class="btn btn-primary btn-block btn-lg">Requets quote</button>
       <p class="summary-note">${icon('shield')} Indicative price incl. VAT. Free site visit, no obligations.</p>`;
  document.getElementById('result').innerHTML = `
    <h2>Your quote</h2>
    <div class="result">
      ${lines}
      <div class="line subtotal"><span>Subtotal</span><span>${formatEuro(q.subtotal)}</span></div>
      <div class="line"><span>VAT (21%)</span><span>${formatEuro(q.vat)}</span></div>
      <div class="line total"><span>Total</span><span>${formatEuro(q.total)}</span></div>
    </div>
    ${footer}`;
}

// ---------- Login ----------
function myQuotes(session) {
  const rows = MY_QUOTES.map(
    (q) => `<li><span><strong>${q.ref}</strong><br /><span class="muted">${q.item}</span></span><span>${formatEuro(q.total)}</span></li>`
  ).join('');
  return `<ul class="quotes">${rows}</ul><p class="muted small">Logged in as ${session.email}</p>`;
}

function loginForm(message = '') {
  return `
    ${message}
    <form id="login-form" class="form">
      <label>Email<input name="email" type="email" autocomplete="email" placeholder="you@example.com" required /></label>
      <label>Password<input name="password" type="password" autocomplete="current-password" placeholder="••••••••" required /></label>
      <button type="submit" class="btn btn-primary btn-block">Log in</button>
    </form>
    <p class="muted small center">New customer? <a href="#/quote">Start with a quote</a></p>`;
}

function loginPage() {
  const session = getSession();
  let body;
  if (!session) {
    body = loginForm();
  } else if (session.expired) {
    body = loginForm('<p class="alert">Your session has expired. Please log in again.</p>');
  } else {
    body = `<h2 class="card-sub">My quotes</h2>${myQuotes(session)}<button id="logout" class="btn btn-outline btn-block">Log out</button>`;
  }
  return `
    <section class="auth">
      <div class="auth-card">
        <span class="icon-tile">${icon(session && !session.expired ? 'user' : 'lock')}</span>
        <h1>Login</h1>
        <p class="muted">Customer portal: follow your quotes, installation and production.</p>
        ${body}
      </div>
    </section>`;
}

// ---------- Router ----------
const routes = {
  '/': { page: home, overlay: true },
  '/solutions': { page: home, overlay: true, anchor: 'solutions' },
  '/projects': { page: home, overlay: true, anchor: 'projects' },
  '/quote': { page: quote },
  '/login': { page: loginPage },
};

function currentPath() {
  const path = location.hash.replace(/^#/, '') || '/';
  return routes[path] ? path : '/';
}

function updateHeader() {
  const route = routes[currentPath()];
  header.classList.toggle('is-overlay', Boolean(route.overlay) && window.scrollY < 40);
}

function render() {
  const path = currentPath();
  const route = routes[path];
  app.innerHTML = route.page();
  document.querySelectorAll('.site-nav [data-route]').forEach((a) => {
    a.classList.toggle('active', a.dataset.route === path);
  });
  header.classList.remove('nav-open');
  document.getElementById('nav-toggle').setAttribute('aria-expanded', 'false');
  if (path === '/quote') renderSummary(document.getElementById('quote-form'));
  if (route.anchor) document.getElementById(route.anchor).scrollIntoView();
  else window.scrollTo(0, 0);
  updateHeader();
}

app.addEventListener('submit', (event) => {
  event.preventDefault();
  if (event.target.id === 'quote-form') renderSummary(event.target, true);
  if (event.target.id === 'login-form') {
    login(new FormData(event.target).get('email'));
    render();
  }
});

app.addEventListener('input', (event) => {
  const form = event.target.closest('#quote-form');
  if (form) renderSummary(form);
});

app.addEventListener('click', (event) => {
  const step = event.target.closest('.qty-btn');
  if (step) {
    const input = document.getElementById('quantity');
    input.value = Math.min(200, Math.max(1, (Number(input.value) || 0) + Number(step.dataset.step)));
    renderSummary(input.form);
  }
  if (event.target.closest('#logout')) {
    logout();
    render();
  }
});

document.getElementById('nav-toggle').addEventListener('click', () => {
  const open = header.classList.toggle('nav-open');
  document.getElementById('nav-toggle').setAttribute('aria-expanded', String(open));
});

window.addEventListener('scroll', updateHeader, { passive: true });
window.addEventListener('hashchange', render);
render();

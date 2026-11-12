// Shared Dataverse Web API helper for all demos: device code auth with a file
// token cache per demo, thin GET/POST/PATCH/DELETE wrappers with retries, $batch,
// publish and solution helpers. A demo creates its own instance:
//   module.exports = require('../../lib/dv').createDv(require('./config'));
// config: { envUrl, solution, prefix, optionPrefix, lcid, cacheDir }
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const msal = require('@azure/msal-node');

const CLIENT_ID = '51f81489-12ee-4a9e-aaae-a2591f45987d';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Errors worth retrying: throttling, transient gateway errors, and metadata locks
// while another customization operation (publish, import) is running.
function isTransient(status, text) {
  if ([429, 502, 503, 504].includes(status)) return true;
  return /0x80071151|GatewayTimeout|CustomizationLock|another .* is (running|in progress)|SQL timeout|Sql Number: 1205|deadlock|try again/i.test(text || '');
}

function createDv(cfg) {
  const API = `${cfg.envUrl}/api/data/v9.2`;
  const CACHE_FILE = path.join(cfg.cacheDir, '.token-cache.json');
  const cachePlugin = {
    beforeCacheAccess: async (ctx) => {
      if (fs.existsSync(CACHE_FILE)) ctx.tokenCache.deserialize(fs.readFileSync(CACHE_FILE, 'utf8'));
    },
    afterCacheAccess: async (ctx) => {
      if (ctx.cacheHasChanged) fs.writeFileSync(CACHE_FILE, ctx.tokenCache.serialize());
    },
  };
  const pca = new msal.PublicClientApplication({
    auth: { clientId: CLIENT_ID, authority: 'https://login.microsoftonline.com/organizations' },
    cache: { cachePlugin },
  });
  let cachedToken = null;

  async function getToken() {
    if (cachedToken && cachedToken.expiresOn > new Date(Date.now() + 5 * 60 * 1000)) return cachedToken.accessToken;
    const scopes = [`${cfg.envUrl}/.default`];
    const accounts = await pca.getTokenCache().getAllAccounts();
    if (accounts.length) {
      try {
        cachedToken = await pca.acquireTokenSilent({ account: accounts[0], scopes });
        return cachedToken.accessToken;
      } catch (e) { /* fall through to device code */ }
    }
    cachedToken = await pca.acquireTokenByDeviceCode({
      scopes,
      deviceCodeCallback: (r) => {
        console.log(`\n>>> ${r.message}\n`);
        fs.writeFileSync(path.join(cfg.cacheDir, '.device-code.txt'), r.message);
      },
    });
    return cachedToken.accessToken;
  }

  async function request(method, url, body, opts = {}) {
    const full = url.startsWith('http') ? url : `${API}/${url.replace(/^\//, '')}`;
    for (let attempt = 1; ; attempt++) {
      const headers = {
        Authorization: `Bearer ${await getToken()}`,
        Accept: 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        Prefer: 'odata.include-annotations="*"',
        ...(body !== undefined ? { 'Content-Type': 'application/json; charset=utf-8' } : {}),
        ...(opts.solution !== false && method !== 'GET' ? { 'MSCRM.SolutionUniqueName': cfg.solution } : {}),
        ...(opts.headers || {}),
      };
      let res;
      try {
        res = await fetch(full, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
      } catch (e) {
        // Network hiccups (reset, DNS, timeout) are retried like transient HTTP errors.
        if (attempt < (opts.retries ?? 6)) { console.log(`  ... network error (${e.cause?.code || e.message}), retry ${attempt}`); await sleep(3000 * attempt); continue; }
        throw e;
      }
      const text = await res.text();
      if (res.ok) {
        const json = text ? JSON.parse(text) : {};
        const entityId = res.headers.get('OData-EntityId');
        if (entityId) {
          const m = entityId.match(/\(([0-9a-f-]{36})\)/i);
          if (m) json.__id = m[1];
        }
        return json;
      }
      if (attempt < (opts.retries ?? 6) && isTransient(res.status, text)) {
        const wait = Number(res.headers.get('Retry-After')) * 1000 || 5000 * attempt;
        console.log(`  ... ${res.status} transient, retry ${attempt} in ${wait / 1000}s`);
        await sleep(wait);
        continue;
      }
      const err = new Error(`${method} ${url} -> ${res.status}: ${text.slice(0, 1500)}`);
      err.status = res.status;
      err.body = text;
      throw err;
    }
  }

  const get = (url, opts) => request('GET', url, undefined, opts);
  const post = (url, body, opts) => request('POST', url, body, opts);
  const patch = (url, body, opts) => request('PATCH', url, body, opts);
  const put = (url, body, opts) => request('PUT', url, body, opts);
  const del = (url, opts) => request('DELETE', url, undefined, opts);

  // Returns all rows of a query, following @odata.nextLink.
  async function getAll(url) {
    let out = [];
    let next = url;
    while (next) {
      const r = await get(next, { headers: { Prefer: 'odata.include-annotations="*",odata.maxpagesize=5000' } });
      out = out.concat(r.value || []);
      next = r['@odata.nextLink'];
    }
    return out;
  }

  async function tryGet(url) {
    try { return await get(url); } catch (e) { if (e.status === 404) return null; throw e; }
  }

  // $batch with one change set per chunk (atomic per chunk, up to 1000 operations).
  // ops: [{ method, url, body, contentId? }]; url relative to the API root.
  // Returns the per-operation results (id from OData-EntityId when present).
  async function batch(ops, { chunk = 500, continueOnError = false, solution = false } = {}) {
    const results = [];
    for (let i = 0; i < ops.length; i += chunk) {
      const part = ops.slice(i, i + chunk);
      const b = `batch_${crypto.randomUUID()}`;
      const cs = `changeset_${crypto.randomUUID()}`;
      const lines = [`--${b}`, `Content-Type: multipart/mixed; boundary=${cs}`, ''];
      part.forEach((o, j) => {
        lines.push(`--${cs}`, 'Content-Type: application/http', 'Content-Transfer-Encoding: binary', `Content-ID: ${o.contentId || j + 1}`, '');
        lines.push(`${o.method} ${o.url.startsWith('$') ? o.url : `${API}/${o.url}`} HTTP/1.1`);
        lines.push('Content-Type: application/json; type=entry');
        if (o.headers) for (const [k, v] of Object.entries(o.headers)) lines.push(`${k}: ${v}`);
        lines.push('', o.body !== undefined ? JSON.stringify(o.body) : '');
      });
      lines.push(`--${cs}--`, `--${b}--`, '');
      const payload = lines.join('\r\n');
      for (let attempt = 1; ; attempt++) {
        const headers = {
          Authorization: `Bearer ${await getToken()}`,
          'OData-MaxVersion': '4.0', 'OData-Version': '4.0', Accept: 'application/json',
          'Content-Type': `multipart/mixed; boundary=${b}`,
          ...(continueOnError ? { Prefer: 'odata.continue-on-error' } : {}),
          ...(solution ? { 'MSCRM.SolutionUniqueName': cfg.solution } : {}),
        };
        const res = await fetch(`${API}/$batch`, { method: 'POST', headers, body: payload });
        const text = await res.text();
        if (!res.ok && attempt < 6 && isTransient(res.status, text)) { await sleep(5000 * attempt); continue; }
        const failed = text.match(/HTTP\/1\.1 [45]\d\d[^\r\n]*[\s\S]*?(\{"error"[\s\S]*?\}\})/);
        if (!res.ok || failed) {
          const err = new Error(`$batch ${i}-${i + part.length} -> ${res.status}: ${(failed ? failed[1] : text).slice(0, 1500)}`);
          err.status = res.status;
          throw err;
        }
        const ids = [...text.matchAll(/OData-EntityId: [^\r\n]*\(([0-9a-f-]{36})\)/gi)].map((m) => m[1]);
        part.forEach((o, j) => results.push({ id: ids[j] }));
        break;
      }
      process.stdout.write(`  batch ${Math.min(i + chunk, ops.length)}/${ops.length}\r`);
    }
    if (ops.length) process.stdout.write('\n');
    return results;
  }

  async function publishAll() {
    console.log('Publishing all customizations (PublishAllXml)...');
    await post('PublishAllXml', {}, { solution: false, retries: 10 });
  }

  async function publishEntities(names) {
    const xml = `<importexportxml><entities>${names.map((n) => `<entity>${n}</entity>`).join('')}</entities></importexportxml>`;
    await post('PublishXml', { ParameterXml: xml }, { solution: false, retries: 10 });
  }

  async function addToSolution(componentId, componentType, addRequired = false) {
    await post('AddSolutionComponent', {
      ComponentId: componentId, ComponentType: componentType, SolutionUniqueName: cfg.solution, AddRequiredComponents: addRequired,
    }, { solution: false });
  }

  const label = (text) => ({
    '@odata.type': 'Microsoft.Dynamics.CRM.Label',
    LocalizedLabels: [{ '@odata.type': 'Microsoft.Dynamics.CRM.LocalizedLabel', Label: text, LanguageCode: cfg.lcid }],
  });

  return { cfg, API, getToken, request, get, post, patch, put, del, getAll, tryGet, batch, publishAll, publishEntities, addToSolution, label, sleep };
}

module.exports = { createDv, sleep };

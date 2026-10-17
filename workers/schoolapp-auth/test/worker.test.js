import { describe, it, expect, beforeAll, vi, afterAll } from 'vitest';
import * as ed from '@noble/ed25519';

// Generate a stable Ed25519 keypair (hex) for tests.
const privHex = '9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60';
const privateKeyB64 = Buffer.from(privHex, 'hex').toString('base64url');

const BASE = 'https://schoolapp.ensam-umi.ac.ma';

const LOGIN_HTML = `<html><body><form><input name="_csrf" value="CSRFTOKENXYZ"/><input name="email"/><input name="password"/></form></body></html>`;

const PROFILE_HTML = `<html><body>
<div class="user-panel"><div class="info"><span>Ali Benali</span><span>Étudiant</span></div></div>
<table class="table"><tr><th>Année</th><td>2025/2026</td></tr></table>
<table class="table">
<tr><th>CNE/Masar</th><td>CNE12345</td></tr>
<tr><th>Nom</th><td>Benali</td></tr>
<tr><th>Prénom</th><td>Ali</td></tr>
<tr><th>Email</th><td>ali.benali@ensam-umi.ac.ma</td></tr>
</table>
</body></html>`;

function mockUpstream(validPassword = 'correct-password') {
  return async (input, init = {}) => {
    const url = new URL(input);
    const method = (init.method || 'GET').toUpperCase();
    const path = url.pathname;

    if (method === 'GET' && path === '/login') {
      return new Response(LOGIN_HTML, { status: 200, headers: { 'content-type': 'text/html' } });
    }

    if (method === 'POST' && path === '/login') {
      const body = new URLSearchParams(init.body || '');
      const password = body.get('password');
      if (password === validPassword) {
        return new Response(null, {
          status: 302,
          headers: { location: '/index', 'set-cookie': 'JSESSIONID=abc123; Path=/' },
        });
      }
      // Failed login: stays on login page.
      return new Response(LOGIN_HTML, { status: 200, headers: { 'content-type': 'text/html' } });
    }

    if (method === 'GET' && path === '/index') {
      return new Response(PROFILE_HTML, { status: 200, headers: { 'content-type': 'text/html' } });
    }

    return new Response('not found', { status: 404 });
  };
}

let worker;

beforeAll(async () => {
  const mod = await import('../src/index.js');
  worker = mod.default;
  vi.stubGlobal('fetch', mockUpstream());
});

afterAll(() => {
  vi.unstubAllGlobals();
});

function env(extra = {}) {
  return {
    SIGNING_PRIVATE_KEY: privateKeyB64,
    ALLOWED_ORIGINS: 'http://localhost:5173',
    SCHOOLAPP_BASE_URL: BASE,
    ...extra,
  };
}

async function loginRequest(body, e = env()) {
  const request = new Request(`${BASE}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost:5173' },
    body: JSON.stringify(body),
  });
  return worker.fetch(request, e);
}

describe('SchoolApp auth worker', () => {
  it('emits a verifiable assertion on valid credentials', async () => {
    const res = await loginRequest({
      email: 'ali.benali@ensam-umi.ac.ma',
      password: 'correct-password',
      challenge: 'ch-1',
      nonce: 'nonce-1',
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.assertion).toBeTruthy();

    // Verify the Ed25519 signature and claims.
    const [h, p, sig] = data.assertion.split('.');
    const message = new TextEncoder().encode(`${h}.${p}`);
    const pub = await ed.getPublicKey(ed.utils.hexToBytes(privHex));
    const valid = await ed.verify(Buffer.from(sig, 'base64url'), message, pub);
    expect(valid).toBe(true);

    const claims = JSON.parse(Buffer.from(p, 'base64url').toString());
    expect(claims.sub).toBe('CNE12345');
    expect(claims.challenge).toBe('ch-1');
    expect(claims.nonce).toBe('nonce-1');
  });

  it('rejects invalid credentials with a generic error', async () => {
    const res = await loginRequest({
      email: 'x@ensam-umi.ac.ma',
      password: 'wrong-password',
      challenge: 'ch-1',
      nonce: 'nonce-1',
    });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('INVALID_CREDENTIALS');
  });

  it('rejects missing fields', async () => {
    const res = await loginRequest({ email: 'a@b.c' });
    expect(res.status).toBe(400);
  });

  it('exposes the derived public key', async () => {
    const request = new Request(`${BASE}/public-key`, { method: 'GET' });
    const res = await worker.fetch(request, env());
    expect(res.status).toBe(200);
    const data = await res.json();
    const expected = Buffer.from(await ed.getPublicKey(ed.utils.hexToBytes(privHex))).toString('base64url');
    expect(data.publicKey).toBe(expected);
  });

  it('returns NOT_CONFIGURED without a signing key', async () => {
    const e = env({ SIGNING_PRIVATE_KEY: undefined });
    const request = new Request(`${BASE}/public-key`, { method: 'GET' });
    const res = await worker.fetch(request, e);
    expect(res.status).toBe(500);
  });

  it('rejects an oversized payload', async () => {
    const request = new Request(`${BASE}/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: 'x'.repeat(10000) }),
    });
    const res = await worker.fetch(request, env());
    expect(res.status).toBe(413);
  });
});

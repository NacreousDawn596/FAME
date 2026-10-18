import { SchoolAppClient } from '../vendor/index.js';
import { derivePublicKey, signAssertion } from './jwt.js';

const DEFAULT_ISSUER = 'https://schoolapp-auth.gadzarts.xyz';
const AUDIENCE = 'fame-api';
const ASSERTION_TTL_SECONDS = 90;
const MAX_BODY_BYTES = 8192;

const upstreamAllowlist = new Set(['https://schoolapp.ensam-umi.ac.ma']);

function json(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders,
    },
  });
}

function corsHeaders(request, env) {
  const origin = request.headers.get('origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const allowOrigin = allowed.includes('*') || allowed.includes(origin) ? origin : null;
  return {
    'access-control-allow-origin': allowOrigin || '',
    'access-control-allow-methods': 'POST, GET, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '600',
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    if (request.method === 'GET' && url.pathname === '/public-key') {
      if (!env.SIGNING_PRIVATE_KEY) {
        return json(500, { error: 'NOT_CONFIGURED' }, corsHeaders(request, env));
      }
      return json(200, { publicKey: await derivePublicKey(env.SIGNING_PRIVATE_KEY) }, corsHeaders(request, env));
    }

    if (request.method === 'POST' && url.pathname === '/login') {
      return handleLogin(request, env);
    }

    return json(404, { error: 'NOT_FOUND' }, corsHeaders(request, env));
  },
};

async function handleLogin(request, env) {
  const cors = corsHeaders(request, env);

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return json(415, { error: 'UNSUPPORTED_MEDIA_TYPE' }, cors);
  }

  if (!env.SIGNING_PRIVATE_KEY) {
    return json(500, { error: 'NOT_CONFIGURED' }, cors);
  }

  let body;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
      return json(413, { error: 'PAYLOAD_TOO_LARGE' }, cors);
    }
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: 'INVALID_JSON' }, cors);
  }

  const { email, password, challenge, nonce } = body || {};
  if (typeof email !== 'string' || typeof password !== 'string'
      || typeof challenge !== 'string' || typeof nonce !== 'string') {
    return json(400, { error: 'MISSING_FIELDS' }, cors);
  }

  const baseUrl = (env.SCHOOLAPP_BASE_URL || 'https://schoolapp.ensam-umi.ac.ma').replace(/\/$/, '');
  if (!upstreamAllowlist.has(baseUrl)) {
    return json(500, { error: 'UPSTREAM_NOT_ALLOWED' }, cors);
  }

  // Fresh, isolated client and cookie jar per attempt — never shared.
  const client = new SchoolAppClient(baseUrl);

  let ok;
  try {
    ok = await client.login(email, password);
  } catch (e) {
    return json(502, { error: 'UPSTREAM_UNAVAILABLE' }, cors);
  }

  if (!ok) {
    await client.resetSession();
    return json(401, { error: 'INVALID_CREDENTIALS' }, cors);
  }

  let profile = null;
  try {
    profile = await client.getProfile();
  } finally {
    // Discard upstream session state immediately after profile fetch.
    await client.resetSession();
  }

  const identity = extractIdentity(profile);
  if (!identity.studentCode) {
    return json(502, { error: 'IDENTITY_UNAVAILABLE' }, cors);
  }

  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: env.ISSUER || DEFAULT_ISSUER,
    aud: AUDIENCE,
    sub: identity.studentCode,
    // Identity email = the login email the user authenticated with, NOT the
    // profile's stored institutional email.
    email: normalizeEmail(email),
    name: clean(identity.fullName),
    niveau: identity.niveau,
    filiere: identity.filiere,
    challenge,
    nonce,
    iat: now,
    nbf: now,
    exp: now + ASSERTION_TTL_SECONDS,
  };

  const assertion = await signAssertion(env.SIGNING_PRIVATE_KEY, claims);
  return json(200, { assertion }, cors);
}

function extractIdentity(profile) {
  const personal = profile?.personal_info || {};
  const contact = profile?.contact_info || {};
  const basic = profile?.basic_info || {};
  const administrative = profile?.administrative_info || {};
  return {
    studentCode: firstNonEmpty(personal['CNE/Masar'], personal['Code'], personal['Code Etudiant']),
    fullName: firstNonEmpty(basic.full_name, personal['Nom'] ? `${personal['Nom']} ${personal['Prénom'] || ''}` : null),
    email: firstNonEmpty(contact['Email'], personal['Email'], basic.email),
    niveau: firstNonEmpty(administrative['Niveau']),
    filiere: firstNonEmpty(administrative['Filière']),
  };
}

function firstNonEmpty(...values) {
  for (const v of values) {
    if (v && String(v).trim()) return String(v).trim();
  }
  return null;
}

function normalizeEmail(value) {
  return (value || '').trim().toLowerCase();
}

/** Collapse internal whitespace/newlines/tabs so names render cleanly. */
function clean(value) {
  if (!value) return null;
  return String(value).replace(/\s+/g, ' ').trim();
}

/**
 * SchoolApp authentication Cloudflare Worker.
 *
 * Authenticates a candidate against ENSAM's SchoolApp and returns a short-lived,
 * Ed25519-signed JWT identity assertion for the FAME backend.
 *
 * The FAME backend verifies this assertion using the matching *public* key and
 * never talks to SchoolApp directly. The private signing key is stored ONLY as a
 * Worker secret and never reaches the browser or the FAME backend.
 *
 * Required Worker secrets / bindings (see docs/authentication.md):
 *   - SCHOOLAPP_PRIVATE_KEY : base64url Ed25519 32-byte seed (from scripts/generate_keys.py)
 *   - SCHOOLAPP_ISSUER      : e.g. "fame-schoolapp"
 *   - SCHOOLAPP_AUDIENCE    : e.g. "fame-api"
 *   - SCHOOLAPP_API_URL     : upstream SchoolApp API base URL
 *   - ALLOWED_ORIGIN        : the FAME frontend origin (CORS)
 *
 * The upstream SchoolApp API is expected to expose:
 *   POST {SCHOOLAPP_API_URL}/auth/login
 *     body:     { "username": string, "password": string }
 *     response: { "name": string, "lastName": string, "year": string,
 *                 "ensamCode": string, "filiere": string }
 *
 * If your SchoolApp API has a different contract, adapt `authenticateWithSchoolApp`.
 */

const ISSUER = globalThis.SCHOOLAPP_ISSUER || "fame-schoolapp";
const AUDIENCE = globalThis.SCHOOLAPP_AUDIENCE || "fame-api";
const ASSERTION_TTL_SECONDS = 300;

const encoder = new TextEncoder();

function b64url(input) {
  let bin = "";
  if (typeof input === "string") {
    bin = input;
  } else {
    const bytes = new Uint8Array(input);
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(input) {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function getSigningKey() {
  const secret = globalThis.SCHOOLAPP_PRIVATE_KEY;
  if (!secret) throw new Error("SCHOOLAPP_PRIVATE_KEY secret is not configured");
  const seed = b64urlDecode(secret);
  return crypto.subtle.importKey("raw", seed, { name: "Ed25519" }, false, ["sign"]);
}

/**
 * Authenticate the candidate against the upstream SchoolApp API.
 * Returns the normalized identity object, or throws on failure.
 */
async function authenticateWithSchoolApp(username, password) {
  const base = globalThis.SCHOOLAPP_API_URL;
  if (!base) {
    throw new Error("SCHOOLAPP_API_URL is not configured on this Worker");
  }
  const res = await fetch(`${base.replace(/\/$/, "")}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    throw new Error(`SchoolApp authentication failed (${res.status})`);
  }
  const data = await res.json();
  if (!data || typeof data.ensamCode !== "string" || !data.ensamCode) {
    throw new Error("SchoolApp response missing ensamCode");
  }
  return {
    name: data.name || "",
    lastName: data.lastName || "",
    year: data.year || "",
    ensamCode: data.ensamCode,
    filiere: data.filiere || "",
  };
}

async function signAssertion(identity) {
  const key = await getSigningKey();
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "EdDSA", typ: "JWT" };
  const payload = {
    sub: identity.ensamCode,
    name: identity.name,
    lastName: identity.lastName,
    year: identity.year,
    filiere: identity.filiere,
    iss: ISSUER,
    aud: AUDIENCE,
    iat: now,
    exp: now + ASSERTION_TTL_SECONDS,
  };

  const headerB64 = b64url(JSON.stringify(header));
  const payloadB64 = b64url(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const signature = await crypto.subtle.sign(
    { name: "Ed25519" },
    key,
    encoder.encode(signingInput)
  );

  return `${signingInput}.${b64url(signature)}`;
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": globalThis.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export default {
  async fetch(request) {
    const origin = globalThis.ALLOWED_ORIGIN || "*";
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/auth") {
      return jsonResponse({ error: "Not found" }, 404);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const { username, password } = body || {};
    if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
      return jsonResponse({ error: "username and password are required" }, 400);
    }

    try {
      const identity = await authenticateWithSchoolApp(username, password);
      const assertion = await signAssertion(identity);
      return jsonResponse({ assertion }, 200);
    } catch (err) {
      return jsonResponse({ error: String(err.message || err) }, 401);
    }
  },
};

/**
 * SchoolApp authentication Cloudflare Worker.
 *
 * Authenticates a candidate against ENSAM's SchoolApp (via the schoolapp.js
 * client library vendored under vendor/schoolapp) and returns a short-lived,
 * Ed25519-signed JWT identity assertion for the FAME backend.
 *
 * The FAME backend verifies this assertion using the matching *public* key and
 * never talks to SchoolApp directly. The private signing key is stored ONLY as a
 * Worker secret and never reaches the browser or the FAME backend.
 *
 * Required Worker secrets / bindings (see docs/authentication.md):
 *   - SCHOOLAPP_PRIVATE_KEY : base64url Ed25519 32-byte seed (scripts/generate_keys.py)
 *   - SCHOOLAPP_ISSUER      : e.g. "fame-schoolapp"
 *   - SCHOOLAPP_AUDIENCE    : e.g. "fame-api"
 *   - ALLOWED_ORIGIN        : the FAME frontend origin (CORS), or "*"
 *   - SCHOOLAPP_API_URL     : optional override for the SchoolApp base URL
 *                             (defaults to https://schoolapp.ensam-umi.ac.ma)
 */

import { SchoolAppClient } from "./vendor/schoolapp/src/school_app_client.js";

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
 * Authenticate the candidate against the upstream SchoolApp using the
 * schoolapp.js client library, and return the normalized identity object.
 */
async function authenticateWithSchoolApp(username, password) {
  const override = globalThis.SCHOOLAPP_API_URL;
  const client = override ? new SchoolAppClient(override) : new SchoolAppClient();

  const loggedIn = await client.login(username, password);
  if (!loggedIn) {
    throw new Error("Invalid SchoolApp credentials");
  }

  const profile = await client.getProfile();
  if (!profile) {
    throw new Error("Could not retrieve SchoolApp profile");
  }

  const personal = profile.personal_info || {};
  const academic = profile.academic_info || {};
  const administrative = profile.administrative_info || {};

  const ensamCode =
    personal["Code"] ||
    administrative["Code"] ||
    personal["CNE/Masar"] ||
    administrative["CNE/Masar"] ||
    "";
  const firstName = personal["Prénom"] || personal["Nom"]?.split(" ")[0] || "";
  const lastName = personal["Nom"] || "";
  const year =
    academic["Niveau Accès"] || academic["Annee Accès"] || "";

  // The student's current filière comes from their academic-year results.
  let filiere = "";
  try {
    const annees = await client.getAnnee();
    if (Array.isArray(annees) && annees.length > 0) {
      const current = annees[annees.length - 1];
      filiere = current.Filiere || current.filiere || "";
    }
  } catch (err) {
    console.warn("[FAME] Could not resolve filiere:", err?.message);
  }

  if (!ensamCode) {
    throw new Error("SchoolApp profile is missing the student code");
  }

  return {
    name: firstName,
    lastName: lastName,
    year: year,
    ensamCode: ensamCode,
    filiere: filiere,
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

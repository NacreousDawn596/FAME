import * as ed from '@noble/ed25519';

/**
 * Minimal Ed25519 (EdDSA) JWT signer. Uses @noble/ed25519 (pure JS, audited,
 * no native deps) so it works identically in Cloudflare Workers and Node.
 */

const te = new TextEncoder();

function bytesToBase64url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToBytes(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function derivePublicKey(privateKeyB64) {
  const priv = base64urlToBytes(privateKeyB64);
  return bytesToBase64url(await ed.getPublicKey(priv));
}

export async function signAssertion(privateKeyB64, claims) {
  const priv = base64urlToBytes(privateKeyB64);
  const header = { alg: 'EdDSA', typ: 'JWT' };
  const h = bytesToBase64url(te.encode(JSON.stringify(header)));
  const p = bytesToBase64url(te.encode(JSON.stringify(claims)));
  const message = te.encode(`${h}.${p}`);
  const sig = await ed.sign(message, priv);
  return `${h}.${p}.${bytesToBase64url(sig)}`;
}

export { bytesToBase64url, base64urlToBytes };

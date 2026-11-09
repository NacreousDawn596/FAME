#!/usr/bin/env python3
"""Generate SchoolApp (Ed25519) and VAPID (EC P-256) keypairs.

Prints ready-to-use environment snippets. Never commit the output.
"""

from __future__ import annotations

import base64

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec, ed25519


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def schoolapp_keys() -> tuple[str, str]:
    key = ed25519.Ed25519PrivateKey.generate()
    # PKCS#8 DER — importable by WebCrypto (Cloudflare Workers) as a private key.
    private = key.private_bytes(
        serialization.Encoding.DER,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    )
    public = key.public_key().public_bytes(
        serialization.Encoding.Raw, serialization.PublicFormat.Raw
    )
    return b64url(private), b64url(public)


def vapid_keys() -> tuple[str, str]:
    key = ec.generate_private_key(ec.SECP256R1())
    private = key.private_bytes(
        serialization.Encoding.DER,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    )
    public = key.public_key().public_bytes(
        serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
    )
    return b64url(public), b64url(private)


if __name__ == "__main__":
    schoolapp_priv, schoolapp_pub = schoolapp_keys()
    vapid_pub, vapid_priv = vapid_keys()

    print("=" * 72)
    print("SchoolApp signing keypair (Ed25519)")
    print("=" * 72)
    print(f"SCHOOLAPP_PRIVATE_KEY (store as Cloudflare Worker secret, NEVER commit):")
    print(f"  {schoolapp_priv}")
    print()
    print("SCHOOLAPP_PUBLIC_KEY (add to backend .env):")
    print(f"  {schoolapp_pub}")
    print()
    print("=" * 72)
    print("VAPID keypair (Web Push, EC P-256)")
    print("=" * 72)
    print("VAPID_PUBLIC_KEY:")
    print(f"  {vapid_pub}")
    print()
    print("VAPID_PRIVATE_KEY:")
    print(f"  {vapid_priv}")
    print()

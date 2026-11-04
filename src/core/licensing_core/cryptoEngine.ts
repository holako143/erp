/**
 * ASF Secure Licensing V2 - Cryptographic Key Management & Ed25519 Engine
 * Strictly isolates Private Key signing (Issuer) from Public Key verification (Client)
 */

import crypto from 'crypto';
import { LicenseClaims, SignedLicenseToken } from './licensingTypes';

// Official Ed25519 Public Key embedded in the client software for verification ONLY.
// (Never include private keys in client code or Git repository).
export const ASF_OFFICIAL_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEARgYNHeV6qRp1KJVsxa6xdSLRYi3WAAwOmf4vbcOv+4U=
-----END PUBLIC KEY-----`;

export const ASF_KEY_ID = 'asf-v2-ed25519-2025';

export function canonicalizeClaimsPayload(claims: LicenseClaims, boundDeviceFingerprintHash: string): string {
  // Sort keys deterministically
  const sortedModules = [...claims.allowedModules].sort();
  const obj = {
    licenseUuid: claims.licenseUuid,
    customerId: claims.customerId,
    customerName: claims.customerName,
    edition: claims.edition,
    issuedAtEpochMs: claims.issuedAtEpochMs,
    expiresAtEpochMs: claims.expiresAtEpochMs,
    maxDevices: claims.maxDevices,
    offlineGraceDays: claims.offlineGraceDays,
    allowedModules: sortedModules,
    isLifetime: claims.isLifetime,
    boundDeviceFingerprintHash,
  };
  return JSON.stringify(obj);
}

/**
 * Signs a license claim using an Ed25519 Private Key (used by License Issuer / Admin CLI)
 */
export function signLicenseClaimsWithEd25519(
  claims: LicenseClaims,
  boundDeviceFingerprintHash: string,
  privateKeyPem: string,
  keyId: string = ASF_KEY_ID
): SignedLicenseToken {
  const payload = canonicalizeClaimsPayload(claims, boundDeviceFingerprintHash);
  const signatureBuffer = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKeyPem);
  const signatureHex = signatureBuffer.toString('hex');

  return {
    version: '2.0',
    claims,
    boundDeviceFingerprintHash,
    activatedAtEpochMs: Date.now(),
    tokenNonce: crypto.randomBytes(16).toString('hex'),
    signature: signatureHex,
    keyId,
  };
}

/**
 * Verifies the Ed25519 signature of a signed license token using the Public Key
 */
export function verifySignedLicenseTokenSignature(
  token: SignedLicenseToken,
  publicKeyPem: string = ASF_OFFICIAL_PUBLIC_KEY_PEM
): { valid: boolean; reason?: string } {
  try {
    if (!token || token.version !== '2.0' || !token.signature || !token.claims) {
      return { valid: false, reason: 'MALFORMED_TOKEN_STRUCTURE' };
    }

    const payload = canonicalizeClaimsPayload(token.claims, token.boundDeviceFingerprintHash);
    const signatureBuffer = Buffer.from(token.signature, 'hex');

    const isValid = crypto.verify(
      null,
      Buffer.from(payload, 'utf8'),
      publicKeyPem,
      signatureBuffer
    );

    if (!isValid) {
      return { valid: false, reason: 'CRYPTOGRAPHIC_SIGNATURE_INVALID' };
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, reason: `VERIFICATION_EXCEPTION: ${err.message}` };
  }
}

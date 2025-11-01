import { MlKem1024 } from 'mlkem';

// === HELPER FUNCTIONS (Uint8Array <-> Base64) ===
// We are standardized on Uint8Array for all in-memory binary data.

/**
 * Converts a Uint8Array (binary data) to a Base64 string.
 */
export function u8ToB64(array: Uint8Array): string {
  // This is a more efficient method than `reduce`
  let binaryString = '';
  for (let i = 0; i < array.byteLength; i++) {
    binaryString += String.fromCharCode(array[i]);
  }
  return window.btoa(binaryString);
}

/**
 * Converts a Base64 string back into a Uint8Array.
 */
export function b64ToU8(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// === KDF (Password-Based Key Derivation) ===

const PBKDF2_ITERATIONS = 100000;

/**
 * Derives a 256-bit AES-GCM key from a user's password.
 * This is the "Master Key" used to encrypt the user's local vault.
 */
export async function deriveMasterKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      // THE FIX: .slice() creates a new copy with a clean type.
      salt: salt.slice(),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generates a deterministic salt from a user's email.
 */
export async function getSaltForUser(email: string): Promise<Uint8Array> {
  const saltData = new TextEncoder().encode(email);
  // .digest() returns an ArrayBuffer
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', saltData);
  // We convert it to a Uint8Array to be consistent
  return new Uint8Array(hashBuffer).slice(0, 16);
}

// === SYMMETRIC ENCRYPTION (AES-GCM) ===

/**
 * Encrypts a plaintext string with a given AES-GCM key.
 * @returns A packed string: "iv_base64:ciphertext_base64"
 */
export async function encryptWithAES(key: CryptoKey, data: string): Promise<string> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
  const encodedData = new TextEncoder().encode(data);

  // .encrypt() returns an ArrayBuffer
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encodedData
  );

  // Convert all parts to Base64 from their respective types
  const ivB64 = u8ToB64(iv);
  const cipherB64 = u8ToB64(new Uint8Array(encryptedBuffer));

  return `${ivB64}:${cipherB64}`;
}

/**
 * Decrypts a packed "iv_base64:ciphertext_base64" string with an AES-GCM key.
 */
export async function decryptWithAES(key: CryptoKey, encryptedData: string): Promise<string> {
  const parts = encryptedData.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted data format');
  }
  
  // Convert from Base64 directly to Uint8Array
  const iv = b64ToU8(parts[0]);
  const ciphertext = b64ToU8(parts[1]);

  // .decrypt() accepts a Uint8Array for IV and data
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      // THE FIX: .slice() creates a new copy with a clean type.
      iv: iv.slice(),
    },
    key,
    // THE FIX: .slice() creates a new copy with a clean type.
    ciphertext.slice()
  );

  return new TextDecoder().decode(decryptedBuffer);
}

// === POST-QUANTUM CRYPTOGRAPHY (ML-KEM-1024) ===

const kem = new MlKem1024();

/**
 * Generates a new Kyber-1024 key pair.
 * @returns Public and Private keys as Base64 strings.
 */
export async function generateKyberKeyPair(): Promise<{ publicKey: string, privateKey: string }> {
  // .generateKeyPair() returns [Uint8Array, Uint8Array]
  const [pk, sk] = await kem.generateKeyPair();
  return {
    publicKey: u8ToB64(pk),
    privateKey: u8ToB64(sk),
  };
}

/**
 * Encapsulates a new shared secret using a recipient's public key.
 * This is run by the CHAT INITIATOR.
 */
export async function encapSharedSecret(
  recipientPublicKeyB64: string
): Promise<{ sharedSecret: string, ciphertext: string }> {
  
  // Convert from Base64 directly to Uint8Array
  const pk = b64ToU8(recipientPublicKeyB64);

  // .encap() expects a Uint8Array and returns [Uint8Array, Uint8Array]
  const [ct, ss] = await kem.encap(pk);

  return {
    sharedSecret: u8ToB64(ss),
    ciphertext: u8ToB64(ct),
  };
}

/**
 * Decapsulates a shared secret using *your* private key and a *received* ciphertext.
 * This is run by the CHAT RECIPIENT.
 */
export async function decapSharedSecret(
  myPrivateKeyB64: string,
  ciphertextB64: string
): Promise<string> {
  
  // Convert from Base64 directly to Uint8Array
  const sk = b64ToU8(myPrivateKeyB64);
  const ct = b64ToU8(ciphertextB64);

  // .decap() expects (Uint8Array, Uint8Array) and returns a Uint8Array
  const ss = await kem.decap(ct, sk);
  return u8ToB64(ss);
}

/**
 * Imports a raw 32-byte shared secret (as Base64) into a CryptoKey
 * that can be used for AES-GCM message encryption/decryption.
 */
export async function importSharedSecret(sharedSecretB64: string): Promise<CryptoKey> {
  // Convert from Base64 directly to Uint8Array
  const rawKey = b64ToU8(sharedSecretB64);
  
  // .importKey() accepts a Uint8Array for 'raw' format
  return window.crypto.subtle.importKey(
    'raw',
    // THE FIX: .slice() creates a new copy with a clean type.
    rawKey.slice(),
    { name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt']
  );
}
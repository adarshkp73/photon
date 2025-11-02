import { MlKem1024 } from 'mlkem';

// === HELPER FUNCTIONS (Uint8Array <-> Base64) ===
export function u8ToB64(array: Uint8Array): string {
  let binaryString = '';
  for (let i = 0; i < array.byteLength; i++) {
    binaryString += String.fromCharCode(array[i]);
  }
  return window.btoa(binaryString);
}

export function b64ToU8(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// === Key Derivation (PBKDF2) ===

const PBKDF2_ITERATIONS = 100000;

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

export async function getSaltForUser(email: string): Promise<Uint8Array> {
  const saltData = new TextEncoder().encode(email);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', saltData);
  return new Uint8Array(hashBuffer).slice(0, 16);
}

// --- DURESS HASHING FUNCTION (FIXED) ---
/**
 * Hashes a password for storage using PBKDF2/SHA-256 (for Duress comparison).
 * Returns a Base64 encoded hash.
 */
export async function hashPasswordForStorage(password: string): Promise<string> { // <-- ADDED EXPORT
    const passwordBytes = new TextEncoder().encode(password);
    
    // Use a fixed, global salt for Duress Hash
    const duressSalt = new TextEncoder().encode("PHOTON_DURESS_SALT"); 

    const key = await window.crypto.subtle.importKey(
        'raw',
        passwordBytes,
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
    );

    const hashBuffer = await window.crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: duressSalt,
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256',
        },
        key,
        256 // 256 bits = 32 bytes
    );

    return u8ToB64(new Uint8Array(hashBuffer));
}

// === SYMMETRIC ENCRYPTION (AES-GCM) ===
export async function encryptWithAES(key: CryptoKey, data: string): Promise<string> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedData = new TextEncoder().encode(data);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encodedData
  );

  const ivB64 = u8ToB64(iv);
  const cipherB64 = u8ToB64(new Uint8Array(encryptedBuffer));

  return `${ivB64}:${cipherB64}`;
}

export async function decryptWithAES(key: CryptoKey, encryptedData: string): Promise<string> {
  const parts = encryptedData.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted data format');
  }
  
  const iv = b64ToU8(parts[0]);
  const ciphertext = b64ToU8(parts[1]);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv.slice(),
    },
    key,
    ciphertext.slice()
  );

  return new TextDecoder().decode(decryptedBuffer);
}

// === POST-QUANTUM CRYPTOGRAPHY (ML-KEM-1024) ===
const kem = new MlKem1024();

export async function generateKyberKeyPair(): Promise<{ publicKey: string, privateKey: string }> {
  const [pk, sk] = await kem.generateKeyPair();
  return {
    publicKey: u8ToB64(pk),
    privateKey: u8ToB64(sk),
  };
}

export async function encapSharedSecret(
  recipientPublicKeyB64: string
): Promise<{ sharedSecret: string, ciphertext: string }> {
  const pk = b64ToU8(recipientPublicKeyB64);
  const [ct, ss] = await kem.encap(pk);
  return {
    sharedSecret: u8ToB64(ss),
    ciphertext: u8ToB64(ct),
  };
}

export async function decapSharedSecret(
  myPrivateKeyB64: string,
  ciphertextB64: string
): Promise<string> {
  const sk = b64ToU8(myPrivateKeyB64);
  const ct = b64ToU8(ciphertextB64);
  const ss = await kem.decap(ct, sk);
  return u8ToB64(ss);
}

export async function importSharedSecret(sharedSecretB64: string): Promise<CryptoKey> {
  const rawKey = b64ToU8(sharedSecretB64);
  return window.crypto.subtle.importKey(
    'raw',
    rawKey.slice(),
    { name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt']
  );
}

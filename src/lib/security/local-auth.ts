/**
 * Local device privacy security using Web Crypto PBKDF2.
 * 
 * IMPORTANT ARCHITECTURAL & SECURITY NOTE:
 * This local lock is designed exclusively as a privacy convenience on a personal device
 * (e.g., shielding from casual shoulder surfing or tab switching).
 * Because all client code and IndexedDB storage execute in the user's browser,
 * anyone with technical access to the browser developer tools can inspect or wipe
 * local storage. It is NOT a server-grade authentication system.
 */

const DEFAULT_ITERATIONS = 100000;

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Derives a PBKDF2 verifier hash from a plaintext passcode and salt.
 */
export async function derivePasscodeVerifier(
  passcode: string,
  salt: Uint8Array,
  iterations = DEFAULT_ITERATIONS
): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passcode),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256 // 32 bytes
  );

  return bufferToHex(derivedBits);
}

/**
 * Generates a fresh random 16-byte salt and derives a PBKDF2 verifier.
 */
export async function createPasscodeCredentials(
  passcode: string
): Promise<{ saltHex: string; hashHex: string; iterations: number }> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const saltHex = bufferToHex(salt.buffer);

  const hashHex = await derivePasscodeVerifier(passcode, salt, DEFAULT_ITERATIONS);

  return {
    saltHex,
    hashHex,
    iterations: DEFAULT_ITERATIONS,
  };
}

/**
 * Verifies an entered passcode against stored salt and verifier hash.
 */
export async function verifyPasscode(
  enteredPasscode: string,
  storedSaltHex: string,
  storedHashHex: string,
  iterations = DEFAULT_ITERATIONS
): Promise<boolean> {
  if (!enteredPasscode || !storedSaltHex || !storedHashHex) {
    return false;
  }

  try {
    const salt = hexToBuffer(storedSaltHex);
    const derived = await derivePasscodeVerifier(enteredPasscode, salt, iterations);
    // Timing-safe-like comparison
    if (derived.length !== storedHashHex.length) return false;
    let result = 0;
    for (let i = 0; i < derived.length; i++) {
      result |= derived.charCodeAt(i) ^ storedHashHex.charCodeAt(i);
    }
    return result === 0;
  } catch {
    return false;
  }
}

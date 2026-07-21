import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

// The key must be a 32-byte hex string (64 characters) or 32-byte string.
// We'll hash it to ensure it's exactly 32 bytes to avoid errors if users provide weird keys.
function getKey() {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  return crypto.createHash('sha256').update(String(secret)).digest();
}

/**
 * Encrypts a plaintext string (e.g., GitHub Token)
 * Returns a base64 encoded string containing IV, Salt, encrypted data, and auth tag.
 */
export function encryptToken(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = getKey();

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();

  // Format: iv:salt:tag:encryptedData
  return Buffer.from(
    `${iv.toString('hex')}:${salt.toString('hex')}:${tag.toString('hex')}:${encrypted}`
  ).toString('base64');
}

/**
 * Decrypts an encrypted token string back to plaintext
 */
export function decryptToken(encryptedText: string): string {
  try {
    const decoded = Buffer.from(encryptedText, 'base64').toString('utf8');
    const parts = decoded.split(':');
    
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted text format');
    }

    const [ivHex, saltHex, tagHex, encryptedDataHex] = parts;

    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const key = getKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedDataHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt token:', error);
    throw new Error('Decryption failed');
  }
}

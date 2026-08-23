import crypto from 'crypto';

const MASTER_ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || 'fabrica_master_secure_secret_2026_aes256_gcm';

export function encryptSecret(plainText: string): string {
  if (!plainText) return '';
  try {
    const iv = crypto.randomBytes(12);
    const key = crypto.scryptSync(MASTER_ENCRYPTION_SECRET, 'fabrica_salt', 32);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  } catch (err) {
    return plainText;
  }
}

export function decryptSecret(encryptedData: string): string {
  if (!encryptedData) return '';
  if (!encryptedData.includes(':')) return encryptedData;
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) return encryptedData;
    const [ivHex, tagHex, contentHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const content = Buffer.from(contentHex, 'hex');
    const key = crypto.scryptSync(MASTER_ENCRYPTION_SECRET, 'fabrica_salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(content), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    return encryptedData;
  }
}

export function hashApiKey(rawKey: string): string {
  if (!rawKey) return '';
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

export function maskApiKey(rawKey: string): string {
  if (!rawKey) return '';
  if (rawKey.length <= 10) return '****';
  return `${rawKey.substring(0, 6)}...${rawKey.slice(-4)}`;
}

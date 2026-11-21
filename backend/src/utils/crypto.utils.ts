import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_SECRET || 'incense-meta-lead-secret-key-32b!'; // Must be 32 bytes
const IV_LENGTH = 16;

/**
 * Encrypts token before storing in database
 */
export const encryptToken = (text: string): string => {
  if (!text) return '';
  try {
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (err) {
    console.error('Token encryption failed:', err);
    return text;
  }
};

/**
 * Decrypts token when fetching for Graph API calls
 */
export const decryptToken = (text: string): string => {
  if (!text) return '';
  try {
    if (!text.includes(':')) return text; // fallback for unencrypted legacy tokens
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    console.error('Token decryption failed:', err);
    return text;
  }
};

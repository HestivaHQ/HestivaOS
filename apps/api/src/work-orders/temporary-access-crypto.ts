import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const VERSION = 'v1';
function key(): Buffer {
  const encoded = process.env.TEMPORARY_ACCESS_CREDENTIAL_ENCRYPTION_KEY;
  if (!encoded) throw new Error('TEMPORARY_ACCESS_CREDENTIAL_ENCRYPTION_KEY is required for protected credential text.');
  const value = Buffer.from(encoded, 'base64');
  if (value.length !== 32) throw new Error('TEMPORARY_ACCESS_CREDENTIAL_ENCRYPTION_KEY must be a base64-encoded 32-byte key.');
  return value;
}
export function encryptCredential(value: string): string {
  const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [VERSION, iv.toString('base64'), cipher.getAuthTag().toString('base64'), ciphertext.toString('base64')].join('.');
}
export function decryptCredential(value: string): string {
  const [version, iv, tag, ciphertext] = value.split('.');
  if (version !== VERSION || !iv || !tag || !ciphertext) throw new Error('Protected credential text is not in a supported encrypted format.');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8');
}

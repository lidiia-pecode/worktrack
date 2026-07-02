import { randomBytes, scrypt } from 'node:crypto';

const SCRYPT_KEYLEN = 32;
const SCRYPT_COST = 16384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLEL = 1;

export function scryptAsync(
  password: string,
  salt: Buffer,
  length: number = SCRYPT_KEYLEN,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      length,
      {
        N: SCRYPT_COST,
        r: SCRYPT_BLOCK_SIZE,
        p: SCRYPT_PARALLEL,
      },
      (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey as Buffer);
      },
    );
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt);

  return `${hash.toString('base64')}$${salt.toString('base64')}`;
}

import { randomBytes, scrypt } from 'node:crypto';

const SCRYPT_KEYLEN = 32;
const SCRYPT_COST = 131072;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLEL = 1;
const SCRYPT_MAX_MEMORY = 256 * 1024 * 1024;

// Each hash needs about 128 MiB, so a few at once can run the server out of
// memory. Hashes run one at a time; the rest wait their turn.
let lastQueuedHash: Promise<unknown> = Promise.resolve();

export function scryptAsync(
  password: string,
  salt: Buffer,
  length: number = SCRYPT_KEYLEN,
): Promise<Buffer> {
  const hash = lastQueuedHash.then(() => runScrypt(password, salt, length));
  lastQueuedHash = hash.catch(() => undefined);

  return hash;
}

function runScrypt(
  password: string,
  salt: Buffer,
  length: number,
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
        maxmem: SCRYPT_MAX_MEMORY,
      },
      (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      },
    );
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt);

  return `${hash.toString('base64')}$${salt.toString('base64')}`;
}

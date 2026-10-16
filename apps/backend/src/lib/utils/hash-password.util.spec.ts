import { scrypt } from 'node:crypto';

import { scryptAsync } from './hash-password.util';

jest.mock('node:crypto', () => ({
  ...jest.requireActual<typeof import('node:crypto')>('node:crypto'),
  scrypt: jest.fn(),
}));

type ScryptCallback = (error: Error | null, derivedKey: Buffer) => void;

const scryptMock = scrypt as unknown as jest.Mock;
const SALT = Buffer.from('salt');
const FAILING_PASSWORD = 'fails-to-hash';
const PARALLEL_HASHES = 5;

describe('scryptAsync', () => {
  let runningHashes = 0;
  let mostHashesAtOnce = 0;

  beforeEach(() => {
    runningHashes = 0;
    mostHashesAtOnce = 0;

    scryptMock.mockReset();
    scryptMock.mockImplementation(
      (
        password: string,
        _salt: Buffer,
        length: number,
        _options: unknown,
        callback: ScryptCallback,
      ) => {
        runningHashes++;
        mostHashesAtOnce = Math.max(mostHashesAtOnce, runningHashes);

        setImmediate(() => {
          runningHashes--;
          if (password === FAILING_PASSWORD) {
            callback(new Error('scrypt failed'), Buffer.alloc(0));
          } else {
            callback(null, Buffer.alloc(length));
          }
        });
      },
    );
  });

  it('runs one hash at a time', async () => {
    const hashes = await Promise.all(
      Array.from({ length: PARALLEL_HASHES }, () =>
        scryptAsync('password', SALT),
      ),
    );

    expect(hashes).toHaveLength(PARALLEL_HASHES);
    expect(scryptMock).toHaveBeenCalledTimes(PARALLEL_HASHES);
    expect(mostHashesAtOnce).toBe(1);
  });

  it('runs the next hash after one fails', async () => {
    const [failed, succeeded] = await Promise.allSettled([
      scryptAsync(FAILING_PASSWORD, SALT),
      scryptAsync('password', SALT),
    ]);

    expect(failed.status).toBe('rejected');
    expect(succeeded.status).toBe('fulfilled');
    expect(mostHashesAtOnce).toBe(1);
  });
});

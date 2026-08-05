import { Injectable } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';

import { scryptAsync } from 'src/lib/utils/hash-password.util';

@Injectable()
export class PasswordService {
  async verify(password: string, hashedPassword: string): Promise<boolean> {
    const [hashBase64, saltBase64] = hashedPassword.split('$');

    if (!hashBase64 || !saltBase64) {
      return false;
    }

    const expected = Buffer.from(hashBase64, 'base64');
    const salt = Buffer.from(saltBase64, 'base64');

    const provided = await scryptAsync(password, salt, expected.length);

    return timingSafeEqual(provided, expected);
  }
}

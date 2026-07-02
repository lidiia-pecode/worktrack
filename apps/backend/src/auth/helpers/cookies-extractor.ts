/* eslint-disable @typescript-eslint/no-unsafe-return */
import type { Request } from 'express';

export const cookieExtractor =
  (cookieName: string) =>
  (req: Request): string | null => {
    return req?.cookies?.[cookieName] ?? null;
  };

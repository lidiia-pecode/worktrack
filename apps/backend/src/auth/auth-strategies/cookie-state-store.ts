import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import type {
  StateStore,
  StateStoreStoreCallback,
  StateStoreVerifyCallback,
} from 'passport-oauth2';

export class CookieStateStore implements StateStore {
  private readonly cookieName = 'oauth_state';

  store(
    req: Request,
    callbackOrMeta: unknown,
    callbackOnly?: StateStoreStoreCallback,
  ): void {
    const callback =
      typeof callbackOrMeta === 'function'
        ? (callbackOrMeta as StateStoreStoreCallback)
        : callbackOnly;

    const state = randomBytes(32).toString('hex');
    const res = req.res as Response | undefined;

    if (res) {
      res.cookie(this.cookieName, state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 10 * 60 * 1000,
        path: '/auth/google',
      });
    }

    if (typeof callback === 'function') {
      callback(null, state);
    }
  }

  verify(
    req: Request,
    providedState: string,
    callbackOrMeta: unknown,
    callbackOnly?: StateStoreVerifyCallback,
  ): void {
    const callback =
      typeof callbackOrMeta === 'function'
        ? (callbackOrMeta as StateStoreVerifyCallback)
        : callbackOnly;

    const savedState = (req.cookies as Record<string, string> | undefined)?.[
      this.cookieName
    ];

    const res = req.res as Response | undefined;
    if (res) {
      res.clearCookie(this.cookieName, { path: '/auth/google' });
    }

    const isValid = Boolean(
      savedState && providedState && savedState === providedState,
    );

    if (typeof callback === 'function') {
      if (!isValid) {
        callback(
          null,
          false,
          'Invalid or missing OAuth state parameter (CSRF protection)',
        );
      } else {
        // 🔑 Передаємо всі 3 аргументи, як вимагає StateStoreVerifyCallback
        callback(null, true, providedState);
      }
    }
  }
}

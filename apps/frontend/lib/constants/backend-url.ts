const LOCAL_BACKEND_URL = "http://localhost:3001";

/**
 * Server-side only: the browser never calls the backend directly, it goes
 * through the /api/backend proxy. Keep this out of `lib/constants/index.ts`,
 * or client code importing that barrel would evaluate it and throw — the
 * variable has no NEXT_PUBLIC_ prefix, so it is undefined in the browser.
 *
 * Falling back to localhost is a convenience for local work. Anywhere else a
 * missing value means the deploy was misconfigured, and a silent fallback would
 * build fine and then talk to nothing.
 */
const readBackendUrl = (): string => {
  const value = process.env.BACKEND_URL;

  if (value) {
    return value;
  }

  if (process.env.NODE_ENV === "development") {
    return LOCAL_BACKEND_URL;
  }

  throw new Error(
    "BACKEND_URL is not set. Point it at the backend for this environment — see apps/frontend/.env.sample.",
  );
};

export const BACKEND_URL = readBackendUrl();

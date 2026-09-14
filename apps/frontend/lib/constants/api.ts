const LOCAL_BACKEND_URL = "http://localhost:3001";

/**
 * Falling back to localhost is a convenience for local work. Anywhere else a
 * missing value means the deploy was misconfigured, and a silent fallback would
 * build fine and then talk to nothing.
 */
const readBackendUrl = (name: string, value: string | undefined): string => {
  if (value) {
    return value;
  }

  if (process.env.NODE_ENV === "development") {
    return LOCAL_BACKEND_URL;
  }

  throw new Error(
    `${name} is not set. Point it at the backend for this environment — see apps/frontend/.env.sample.`,
  );
};

export const API_PROXY_URL = "/api/backend";

export const BACKEND_URL = readBackendUrl(
  "BACKEND_URL",
  process.env.BACKEND_URL,
);

export const PUBLIC_BACKEND_URL = readBackendUrl(
  "NEXT_PUBLIC_BACKEND_URL",
  process.env.NEXT_PUBLIC_BACKEND_URL,
);

export const GOOGLE_SIGNUP_URL = `${PUBLIC_BACKEND_URL}/auth/google/signup`;

export const GOOGLE_LOGIN_URL = `${PUBLIC_BACKEND_URL}/auth/google`;

export const GOOGLE_INVITATION_URL = `${PUBLIC_BACKEND_URL}/invitations/google`;

export const API_PROXY_URL = "/api/backend";

export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";

export const PUBLIC_BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

export const GOOGLE_SIGNUP_URL = `${PUBLIC_BACKEND_URL}/auth/google/signup`;

export const GOOGLE_LOGIN_URL = `${PUBLIC_BACKEND_URL}/auth/google`;

export const GOOGLE_INVITATION_URL = `${PUBLIC_BACKEND_URL}/invitations/google`;

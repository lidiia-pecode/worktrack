export const API_PROXY_URL = "/api/backend";

// Google OAuth flows go through the frontend proxy so auth cookies
// set by the backend stay on the frontend's origin.
export const GOOGLE_SIGNUP_URL = `${API_PROXY_URL}/auth/google/signup`;

export const GOOGLE_LOGIN_URL = `${API_PROXY_URL}/auth/google`;

export const GOOGLE_LINK_URL = `${API_PROXY_URL}/auth/google/link`;

export const GOOGLE_INVITATION_URL = `${API_PROXY_URL}/invitations/google`;

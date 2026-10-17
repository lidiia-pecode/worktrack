// Several requests can fail at once; only the first one redirects. The reload
// resets this, so a later expiry in the same tab redirects again.
let isRedirecting = false;

export function handleSessionExpired() {
  if (typeof window === "undefined") return;
  if (window.location.pathname === "/") return;
  if (isRedirecting) return;

  isRedirecting = true;

  // A full reload is deliberate: this runs outside React, and the reload clears all client state after the session ends.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = "/";
}

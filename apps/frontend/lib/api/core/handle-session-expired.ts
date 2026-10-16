export function handleSessionExpired() {
  if (typeof window === "undefined") return;
  if (window.location.pathname === "/") return;
  if (sessionStorage.getItem("redirecting")) return;

  sessionStorage.setItem("redirecting", "1");

  // A full reload is deliberate: this runs outside React, and the reload clears all client state after the session ends.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = "/";
}

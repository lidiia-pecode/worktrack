import { useAuthStore } from "@/stores/authStore";

export function handleSessionExpired() {
  if (typeof window === "undefined") return;
  if (window.location.pathname === "/") return;
  if (sessionStorage.getItem("redirecting")) return;

  sessionStorage.setItem("redirecting", "1");
  useAuthStore.getState().logout();

  window.location.href = "/";
}

// core/create-client.ts
import { API_PROXY_URL } from "@/lib/constants";
import { apiClient, basicClient } from "./http-client";

export type Client = typeof apiClient | typeof basicClient;

type CreateClientConfig = {
  endpoint: string;
  client?: Client;
};

export function createClient({
  endpoint,
  client = apiClient,
}: CreateClientConfig) {
  const baseUrl = `${API_PROXY_URL}/${endpoint}`;

  return {
    get: <T>(path = "") =>
      client<T>(() =>
        fetch(`${baseUrl}${path}`, {
          credentials: "include",
        }),
      ),

    post: <T>(path = "", body?: unknown) =>
      client<T>(() =>
        fetch(`${baseUrl}${path}`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: body ? JSON.stringify(body) : undefined,
        }),
      ),

    patch: <T>(path = "", body?: unknown) =>
      client<T>(() =>
        fetch(`${baseUrl}${path}`, {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: body ? JSON.stringify(body) : undefined,
        }),
      ),

    delete: <T>(path = "") =>
      client<T>(() =>
        fetch(`${baseUrl}${path}`, {
          method: "DELETE",
          credentials: "include",
        }),
      ),
  };
}

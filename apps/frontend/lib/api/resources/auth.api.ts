"use client";

import { User } from "@/types";
import { createClient, apiClient, basicClient } from "../core/";
import { SignInPayload, SignUpPayload } from "@/types/AuthSession";

const auth = createClient({
  endpoint: "auth",
  client: basicClient,
});

const authApi = createClient({
  endpoint: "auth",
  client: apiClient,
});

const users = createClient({
  endpoint: "users",
  client: apiClient,
});

export const AuthClient = {
  completeGoogleSignup: (data: { token: string; companyName: string }) =>
    auth.post("/google/signup/complete", data),

  signup: (data: SignUpPayload) => auth.post("/signup", data),

  login: (data: SignInPayload) => auth.post("/signin", data),

  logout: () => auth.post("/logout"),

  me: () => users.get<User>("/me"),

  changePassword: (data: { currentPassword?: string; newPassword: string }) =>
    authApi.patch<{ success: boolean }>("/password", data),
};

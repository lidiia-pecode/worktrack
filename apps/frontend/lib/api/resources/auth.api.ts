"use client";

import { User } from "@/types";
import { createClient, apiClient, basicClient } from "../core/";

type SignUpDto = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
};

type LoginDto = {
  email: string;
  password: string;
};

const auth = createClient({
  endpoint: "auth",
  client: basicClient,
});

const users = createClient({
  endpoint: "users",
  client: apiClient,
});

export const AuthClient = {
  signup: (data: SignUpDto) => auth.post("/signup", data),
  login: (data: LoginDto) => auth.post("/signin", data),
  logout: () => auth.post("/logout"),
  me: () => users.get<User>("/me"),
};

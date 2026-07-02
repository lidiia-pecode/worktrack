"use client";

import { User } from "@/types";
import { BASE_API_URL } from "../api-consts";
import { apiClient } from "../apiClient";
import { publicClient } from "../publicClient";

type SignUpDto = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
};

export type LoginDto = {
  email: string;
  password: string;
};

export const AuthClient = {
  signup: (data: SignUpDto) =>
    publicClient(() =>
      fetch(`${BASE_API_URL}/auth/signup`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    ),

  login: (data: LoginDto) =>
    publicClient(() =>
      fetch(`${BASE_API_URL}/auth/signin`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    ),

  logout: () =>
    publicClient(() =>
      fetch(`${BASE_API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      }),
    ),

  me: () =>
    apiClient<User>(() =>
      fetch(`${BASE_API_URL}/users/me`, {
        credentials: "include",
      }),
    ),
};

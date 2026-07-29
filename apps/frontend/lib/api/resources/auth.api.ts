"use client";

import { User } from "@/types";
import { createClient, apiClient, basicClient } from "../core/";

// import { User } from "@/types";
// import { apiClient } from "@/lib/api";
// import { basicClient } from "@/lib/api";
// import { API_PROXY_URL } from "@/lib/constants";

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

// export const AuthClient = {
//   signup: (data: SignUpDto) =>
//     basicClient(() =>
//       fetch(`${API_PROXY_URL}/auth/signup`, {
//         method: "POST",
//         credentials: "include",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(data),
//       }),
//     ),

//   login: (data: LoginDto) =>
//     basicClient(() =>
//       fetch(`${API_PROXY_URL}/auth/signin`, {
//         method: "POST",
//         credentials: "include",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(data),
//       }),
//     ),

//   logout: () =>
//     basicClient(() =>
//       fetch(`${API_PROXY_URL}/auth/logout`, {
//         method: "POST",
//         credentials: "include",
//       }),
//     ),

//   me: () =>
//     apiClient<User>(() =>
//       fetch(`${API_PROXY_URL}/users/me`, {
//         credentials: "include",
//       }),
//     ),
// };

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

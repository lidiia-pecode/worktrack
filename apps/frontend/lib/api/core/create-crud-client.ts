// "use client";

// import { API_PROXY_URL } from "@/lib/constants";
// import { apiClient } from "@/lib/api";

// type CrudApiConfig = {
//   endpoint: string;
// };

// export function createCrudClient<TEntity, TCreate, TUpdate, TList>({
//   endpoint,
// }: CrudApiConfig) {
//   return {
//     getAll: (page = 1) =>
//       apiClient<TList>(() =>
//         fetch(`${API_PROXY_URL}/${endpoint}?page=${page}`, {
//           credentials: "include",
//         }),
//       ),

//     getById: (id: string) =>
//       apiClient<TEntity>(() =>
//         fetch(`${API_PROXY_URL}/${endpoint}/${id}`, {
//           credentials: "include",
//         }),
//       ),

//     create: (data: TCreate) =>
//       apiClient<TEntity>(() =>
//         fetch(`${API_PROXY_URL}/${endpoint}`, {
//           method: "POST",
//           credentials: "include",
//           headers: {
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify(data),
//         }),
//       ),

//     update: (id: string, data: TUpdate) =>
//       apiClient<TEntity>(() =>
//         fetch(`${API_PROXY_URL}/${endpoint}/${id}`, {
//           method: "PATCH",
//           credentials: "include",
//           headers: {
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify(data),
//         }),
//       ),

//     delete: (id: string) =>
//       apiClient<TEntity>(() =>
//         fetch(`${API_PROXY_URL}/${endpoint}/${id}`, {
//           method: "DELETE",
//           credentials: "include",
//         }),
//       ),
//   };
// }

"use client";

import { createClient } from "./create-client";

type CrudClientConfig = {
  endpoint: string;
};

type GetAllOptions<TQuery> = {
  page?: number;
  query?: TQuery;
};

const buildQuery = (query?: unknown) => {
  const params = new URLSearchParams();

  Object.entries((query ?? {}) as Record<string, unknown>).forEach(
    ([key, value]) => {
      if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    },
  );

  return params;
};

export function createCrudClient<
  TEntity,
  TCreate,
  TUpdate,
  TList,
  TQuery = never,
>({ endpoint }: CrudClientConfig) {
  const client = createClient({ endpoint });

  return {
    getAll: (options: number | GetAllOptions<TQuery> = {}) => {
      const page = typeof options === "number" ? options : options.page;
      const query = typeof options === "number" ? undefined : options.query;

      const params = buildQuery(query);

      if (page !== undefined) {
        params.set("page", String(page));
      }

      const suffix = params.toString();

      return client.get<TList>(suffix ? `?${suffix}` : "");
    },

    getById: (id: string) => client.get<TEntity>(`/${id}`),

    create: (data: TCreate) => client.post<TEntity>("", data),

    update: (id: string, data: TUpdate) =>
      client.patch<TEntity>(`/${id}`, data),

    delete: (id: string) => client.delete<TEntity>(`/${id}`),
  };
}

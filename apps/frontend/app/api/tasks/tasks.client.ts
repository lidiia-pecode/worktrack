import { TaskPayload, TaskResponse, UpdateTaskPayload } from "@/types";
import { BASE_API_URL } from "../api-consts";
import { apiClient } from "../apiClient";

export const TasksClientApi = {
  getAllByProject: (page: number, id: string) =>
    apiClient<TaskResponse>(() =>
      fetch(`${BASE_API_URL}/tasks?page=${page}projectId=${id}`, {
        credentials: "include",
      }),
    ),

  create: (data: TaskPayload) =>
    apiClient(() =>
      fetch(`${BASE_API_URL}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      }),
    ),

  update: (id: string, data: UpdateTaskPayload) =>
    apiClient(() =>
      fetch(`${BASE_API_URL}/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      }),
    ),

  delete: (id: string) =>
    apiClient(() =>
      fetch(`${BASE_API_URL}/tasks/${id}`, {
        method: "DELETE",
        credentials: "include",
      }),
    ),
};

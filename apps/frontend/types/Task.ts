import { TaskStatus } from "./enums";

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  project_id: string;
  user_id: string | null;
  estimate: number;
  updated_at: Date;
  created_at: Date;
}

export type TaskPayload = Omit<Task, "id" | "updated_at" | "created_at">;

export type UpdateTaskPayload = Partial<TaskPayload>;

export type TaskResponse = {
  count: number;
  next: number | null;
  previous: number | null;
  results: Task[];
};

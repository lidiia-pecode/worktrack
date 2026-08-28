// "use client";

// import { createClient } from "../core";

// import {
//   ProjectActivityListResponse,
//   // ProjectActivityPayload,
// } from "@/types/ProjectActivities";

// const client = createClient({
//   endpoint: "projects",
// });

// export const ProjectActivitiesClientApi = {
//   getAll: (projectId: string) =>
//     client.get<ProjectActivityListResponse>(`/${projectId}/activities`),
// Заблоковано: POST/PATCH /projects/:id/activities не реалізовані на backend (осиротілі DTO, див. roadmap B2-06)
// addActivity: ...

// addActivity: (projectId: string, data: ProjectActivityPayload) =>
//   client.post(`/${projectId}/activities`, data),

// archiveActivity: (projectId: string, projectActivityId: string) =>
//   client.archive(`/${projectId}/activities/${projectActivityId}`),
// };

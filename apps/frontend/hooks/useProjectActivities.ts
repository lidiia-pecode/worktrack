// import { ProjectActivitiesClientApi } from "@/app/api/activities/project-activities.client";
// import { ProjectActivityPayload } from "@/types/ProjectActivities";
// import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// import { toast } from "sonner";

// export function useProjectActivities(projectId: string) {
//   const queryClient = useQueryClient();

//   const query = useQuery({
//     queryKey: ["projectActivities", projectId],
//     queryFn: () => ProjectActivitiesClientApi.getAll(projectId),
//     enabled: !!projectId,
//   });

//   const addActivity = useMutation({
//     mutationFn: (payload: ProjectActivityPayload) =>
//       ProjectActivitiesClientApi.addActivity(projectId, payload),
//     onSuccess: () => {
//       queryClient.invalidateQueries({
//         queryKey: ["projectActivities", projectId],
//       });

//       toast.success("Activity added");
//     },
//   });

//   const archiveActivity = useMutation({
//     mutationFn: (projectActivityId: string) =>
//       ProjectActivitiesClientApi.archiveActivity(projectId, projectActivityId),
//     onSuccess: () => {
//       queryClient.invalidateQueries({
//         queryKey: ["projectActivities", projectId],
//       });

//       toast.success("Activity archived");
//     },
//   });

//   return {
//     ...query,
//     addActivity,
//     archiveActivity,
//   };
// }

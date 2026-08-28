// "use client";

// import { useMutation } from "@tanstack/react-query";
// import { toast } from "sonner";

// import { AuthClient } from "@/lib/api/resources";
// import { getErrorMessage } from "@/lib/api/errors";

// export function useForgotPassword() {
//   const forgotPassword = useMutation({
//     mutationFn: AuthClient.forgotPassword,

//     onSuccess: () => {
//       toast.success("Password reset link has been sent to your gmail account.");
//     },

//     onError: (error) => {
//       toast.error(getErrorMessage(error));
//     },
//   });

//   return {
//     actions: {
//       forgotPassword,
//     },
//   };
// }

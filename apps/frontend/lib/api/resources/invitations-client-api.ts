"use client";

import {
  CompleteInvitationPayload,
  CreateInvitationPayload,
  InvitationValidation,
  PendingInvitation,
} from "@/types/Invitation";
import { createClient } from "../core";

const client = createClient({ endpoint: "invitations" });

export const InvitationsClientApi = {
  create: (data: CreateInvitationPayload) => client.post("", data),

  listPending: () => client.get<PendingInvitation[]>(""),

  resend: (id: string) => client.post(`/${id}/resend`),

  revoke: (id: string) => client.patch(`/${id}/revoke`),

  validate: (token: string) =>
    client.get<InvitationValidation>(
      `/validate?token=${encodeURIComponent(token)}`,
    ),

  completeWithPassword: (data: CompleteInvitationPayload) =>
    client.post("/complete-password", data),
};

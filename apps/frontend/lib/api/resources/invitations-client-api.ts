"use client";

import {
  CompleteInvitationPayload,
  CreateInvitationPayload,
  InvitationValidation,
} from "@/types/Invitation";
import { createClient } from "../core";

const client = createClient({ endpoint: "invitations" });

export const InvitationsClientApi = {
  create: (data: CreateInvitationPayload) => client.post("", data),

  validate: (token: string) =>
    client.get<InvitationValidation>(
      `/validate?token=${encodeURIComponent(token)}`,
    ),

  completeWithPassword: (data: CompleteInvitationPayload) =>
    client.post("/complete-password", data),
};

// apps/backend/src/auth/dtos/create-session.dto.ts
export class CreateSessionDto {
  id?: string;
  userId!: string;
  companyId!: string;
  refreshHash!: string;
  expiresAt!: Date;
  ip?: string;
  userAgent?: string;
}

// apps/backend/src/auth/dtos/link-google.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class LinkGoogleDto {
  @IsString()
  @IsNotEmpty()
  googleId!: string;
}

import { IsOptional, IsString } from 'class-validator';

export class InvitationTokenQuery {
  @IsOptional()
  @IsString()
  token?: string;
}

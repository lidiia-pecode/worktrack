import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class ProjectActivityPayload {
  @IsUUID()
  activityId!: string;
}

export class UpdateProjectActivityPayload extends PartialType(
  ProjectActivityPayload,
) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

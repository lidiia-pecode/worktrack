import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class ProjectPayload {
  @IsString()
  @MinLength(3)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID('all', { each: true })
  userIds?: string[];

  @IsOptional()
  @IsUUID('all', { each: true })
  activityIds?: string[];
}

export class UpdateProjectPayload extends PartialType(ProjectPayload) {}

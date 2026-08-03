import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class ProjectPayload {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsUUID('all', { each: true })
  userIds?: string[];

  @IsOptional()
  @IsUUID('all', { each: true })
  activityIds?: string[];
}

export class UpdateProjectPayload extends PartialType(ProjectPayload) {}

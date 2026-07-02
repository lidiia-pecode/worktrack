import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { ProjectStatus } from '../enums/ProjectStatus.enum';

export class ProjectPayload {
  @IsString()
  @MinLength(3)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsUUID('all', { each: true })
  userIds?: string[];
}

export class UpdateProjectPayload extends PartialType(ProjectPayload) {}

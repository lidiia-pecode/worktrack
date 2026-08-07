import {
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { NormalizeString } from 'src/lib/decorators';

export class ProjectPayload {
  @NormalizeString()
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @NormalizeString()
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(255)
  clientName?: string | null;

  @NormalizeString()
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  activityIds?: string[];
}

export class UpdateProjectPayload extends PartialType(ProjectPayload) {}

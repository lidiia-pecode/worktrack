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
import { OptionalNotNull, TrimString } from 'src/lib/decorators';

export class ProjectPayload {
  @TrimString({ keepNull: true })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @TrimString({ keepNull: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(255)
  clientName?: string | null;

  @TrimString()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @OptionalNotNull()
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  activityIds?: string[];

  @OptionalNotNull()
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  userIds?: string[];
}

export class UpdateProjectPayload extends PartialType(ProjectPayload, {
  skipNullProperties: false,
}) {}

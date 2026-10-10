import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { TrimString } from 'src/lib/decorators';

export class ActivityPayload {
  @TrimString()
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  /** Omit it, or send null, for a draft. */
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @IsBoolean()
  defaultBillable?: boolean;
}

export class UpdateActivityPayload extends PartialType(ActivityPayload) {}

/** Where an activity goes when its own category is archived. */
export class RestoreActivityPayload {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  /** Restore it as a draft; refused while a project links it. */
  @IsOptional()
  @IsBoolean()
  withoutCategory?: boolean;
}

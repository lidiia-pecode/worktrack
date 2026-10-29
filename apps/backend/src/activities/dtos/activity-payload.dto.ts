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
import { OptionalNotNull, TrimString } from 'src/lib/decorators';

export class ActivityPayload {
  @TrimString({ keepNull: true })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  /** Every activity is in a category; it is moved or archived, never left without one. */
  @IsNotEmpty()
  @IsUUID()
  categoryId!: string;

  @OptionalNotNull()
  @IsBoolean()
  defaultBillable?: boolean;
}

export class UpdateActivityPayload extends PartialType(ActivityPayload, {
  skipNullProperties: false,
}) {}

/** Where an activity goes when its own category is archived. */
export class RestoreActivityPayload {
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}

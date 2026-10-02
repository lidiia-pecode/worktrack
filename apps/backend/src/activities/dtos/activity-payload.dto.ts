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

  @IsUUID()
  categoryId!: string;

  @IsOptional()
  @IsBoolean()
  defaultBillable?: boolean;
}

export class UpdateActivityPayload extends PartialType(ActivityPayload) {}

/** A new active category, for an activity whose own category is archived. */
export class RestoreActivityPayload {
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}

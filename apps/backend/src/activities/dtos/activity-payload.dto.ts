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

  /** Left out, or null, for a draft; null on an update takes it away. */
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @IsBoolean()
  defaultBillable?: boolean;
}

export class UpdateActivityPayload extends PartialType(ActivityPayload) {}

/** For an activity whose own category is archived: where it goes instead. */
export class RestoreActivityPayload {
  /** A new active category. */
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  /** Back as a draft, which only an activity on no project may be. */
  @IsOptional()
  @IsBoolean()
  withoutCategory?: boolean;
}

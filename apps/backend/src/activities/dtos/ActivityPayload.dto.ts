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
import { NormalizeString } from 'src/lib/decorators';

export class ActivityPayload {
  @NormalizeString()
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsUUID()
  categoryId!: string;

  @IsOptional()
  @IsBoolean()
  isAbsence?: boolean;

  @IsOptional()
  @IsBoolean()
  defaultBillable?: boolean;
}

export class UpdateActivityPayload extends PartialType(ActivityPayload) {}

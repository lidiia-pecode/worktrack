import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ReportingPeriodStatus } from '../enum/reporting-period-status.enum';
import { PartialType } from '@nestjs/swagger';

export class CreateReportingPeriodDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @IsDateString()
  @IsNotEmpty()
  endDate!: string;

  @IsEnum(ReportingPeriodStatus)
  @IsOptional()
  status?: ReportingPeriodStatus;
}

export class UpdateReportingPeriodDto extends PartialType(
  CreateReportingPeriodDto,
) {}

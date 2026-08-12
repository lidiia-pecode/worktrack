import { IsDateString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class GetReportQueryDto {
  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @IsDateString()
  @IsNotEmpty()
  endDate!: string;

  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsUUID()
  @IsOptional()
  projectId?: string;
}

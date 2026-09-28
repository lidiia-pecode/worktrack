import { IsDateWithoutTimeString } from 'src/lib/validators/IsDateWithoutTimeString';

export class HoursExportQuery {
  @IsDateWithoutTimeString()
  dateFrom!: string;

  @IsDateWithoutTimeString()
  dateTo!: string;
}

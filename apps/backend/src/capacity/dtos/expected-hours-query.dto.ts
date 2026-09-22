import { IsDateWithoutTimeString } from 'src/lib/validators/IsDateWithoutTimeString';

export class ExpectedHoursQuery {
  @IsDateWithoutTimeString()
  dateFrom!: string;

  @IsDateWithoutTimeString()
  dateTo!: string;
}

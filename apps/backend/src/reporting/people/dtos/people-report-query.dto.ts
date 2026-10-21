import { IsDateWithoutTimeString } from 'src/lib/validators/IsDateWithoutTimeString';

export class PeopleReportQuery {
  @IsDateWithoutTimeString()
  dateFrom!: string;

  @IsDateWithoutTimeString()
  dateTo!: string;
}

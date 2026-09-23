import { IsDateWithoutTimeString } from 'src/lib/validators/IsDateWithoutTimeString';

export class UtilisationQuery {
  @IsDateWithoutTimeString()
  dateFrom!: string;

  @IsDateWithoutTimeString()
  dateTo!: string;
}

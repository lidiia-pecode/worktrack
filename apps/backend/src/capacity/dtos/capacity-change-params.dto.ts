import { IsUUID } from 'class-validator';
import { IsDateWithoutTimeString } from 'src/lib/validators/IsDateWithoutTimeString';

export class CapacityChangeParams {
  @IsUUID()
  userId!: string;

  @IsDateWithoutTimeString()
  validFrom!: string;
}

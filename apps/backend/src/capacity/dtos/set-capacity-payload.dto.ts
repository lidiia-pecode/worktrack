import { IsInt, IsUUID, Max, Min } from 'class-validator';
import { IsDateWithoutTimeString } from 'src/lib/validators/IsDateWithoutTimeString';

export class SetCapacityPayload {
  @IsUUID()
  userId!: string;

  @IsInt()
  @Min(0)
  @Max(10080)
  minutesPerWeek!: number;

  @IsDateWithoutTimeString()
  validFrom!: string;
}

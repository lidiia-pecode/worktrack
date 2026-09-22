import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class CapacityResponse {
  @Expose()
  userId!: string;

  @Expose()
  minutesPerWeek!: number;

  @Expose()
  validFrom!: string | null;

  @Expose()
  isCompanyDefault!: boolean;
}

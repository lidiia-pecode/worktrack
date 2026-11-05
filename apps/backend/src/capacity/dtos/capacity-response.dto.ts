import { Exclude, Expose, Type } from 'class-transformer';

@Exclude()
export class CapacityChangeResponse {
  @Expose()
  validFrom!: string;

  @Expose()
  minutesPerWeek!: number;
}

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

  /** The change that starts after today; there is at most one. */
  @Expose()
  @Type(() => CapacityChangeResponse)
  upcoming!: CapacityChangeResponse | null;
}

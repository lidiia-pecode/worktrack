import { Exclude, Expose, Type } from 'class-transformer';

import { IsDateWithoutTimeString } from 'src/lib/validators/IsDateWithoutTimeString';
import { AbsenceType } from 'src/absences/enums/absence-type.enum';

export class LastWorkingDayPayload {
  @IsDateWithoutTimeString()
  lastWorkingDay!: string;
}

export class FirstDayBackPayload {
  @IsDateWithoutTimeString()
  firstDayBack!: string;
}

@Exclude()
export class RemovedTimeResponse {
  @Expose()
  entryCount!: number;

  @Expose()
  minutes!: number;

  @Expose()
  firstDate!: string | null;

  @Expose()
  lastDate!: string | null;
}

@Exclude()
export class RemovedAbsenceResponse {
  @Expose()
  id!: string;

  @Expose()
  type!: AbsenceType;

  @Expose()
  startDate!: string;

  @Expose()
  endDate!: string;

  /** It started on or before the last working day, so it is cut, not deleted. */
  @Expose()
  isCut!: boolean;
}

@Exclude()
export class RemovedPlansResponse {
  @Expose()
  projectId!: string;

  @Expose()
  projectName!: string;

  @Expose()
  planCount!: number;

  @Expose()
  firstDate!: string;

  @Expose()
  lastDate!: string;
}

/** What deactivating someone with a given last working day removes. */
@Exclude()
export class DeactivationImpactResponse {
  @Expose()
  @Type(() => RemovedTimeResponse)
  time!: RemovedTimeResponse;

  @Expose()
  @Type(() => RemovedAbsenceResponse)
  absences!: RemovedAbsenceResponse[];

  @Expose()
  @Type(() => RemovedPlansResponse)
  plans!: RemovedPlansResponse[];
}

import { Expose, Type } from 'class-transformer';
import { ProjectActivityResponse } from 'src/projects/dtos/ProjectActivityResponse.dto';

export class TimeLogResponse {
  @Expose()
  id!: string;

  @Expose()
  userId!: string;

  @Expose()
  @Type(() => ProjectActivityResponse)
  projectActivity!: ProjectActivityResponse;

  @Expose()
  isBillable!: boolean;

  @Expose()
  minutes!: number;

  @Expose()
  note?: string;

  @Expose()
  date!: string;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}

import { Expose } from 'class-transformer';
import { Status } from 'src/enums/Status.enum';

export class ProjectSummaryResponse {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  status!: Status;
}

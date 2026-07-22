import { Expose } from 'class-transformer';
import { Status } from 'src/enums/Status.enum';

export class ActivityCategoryResponse {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  status!: Status;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}

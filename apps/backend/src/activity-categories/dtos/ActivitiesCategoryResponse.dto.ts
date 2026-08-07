import { Exclude, Expose } from 'class-transformer';
import { ActCategoryStatus } from '../enums/category-status';

@Exclude()
export class ActivityCategoryResponse {
  @Expose()
  id!: string;

  @Expose()
  companyId!: string;

  @Expose()
  name!: string;

  @Expose()
  status!: ActCategoryStatus;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}

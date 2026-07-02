import { Expose } from 'class-transformer';
import { ActCategory } from 'src/activity-categories/entities/activities-category.entity';

export class ActivityResponse {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  category!: ActCategory;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}

import { Expose } from 'class-transformer';

export class ArchiveImpactProjectResponse {
  @Expose()
  id!: string;

  @Expose()
  name!: string;
}

import { Expose } from 'class-transformer';

export class SuccessResponse {
  @Expose()
  success!: boolean;
}

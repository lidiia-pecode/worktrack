import { Expose } from 'class-transformer';

export class SuccessResponse {
  @Expose()
  success!: boolean;
}

export class LinkGoogleResponse {
  @Expose()
  success!: boolean;

  @Expose()
  message!: string;
}

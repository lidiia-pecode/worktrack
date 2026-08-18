import { Expose } from 'class-transformer';

export class TokenResponse {
  @Expose()
  access_token!: string;
}

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

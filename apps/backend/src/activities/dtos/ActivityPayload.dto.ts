import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class ActivityPayload {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsUUID()
  categoryId!: string;
}

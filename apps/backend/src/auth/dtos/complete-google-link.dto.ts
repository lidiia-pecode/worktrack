import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CompleteGoogleLinkDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).*$/)
  password!: string;
}

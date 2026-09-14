import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { NormalizeString } from 'src/lib/decorators';

export class ActivityCategoryPayload {
  @NormalizeString()
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;
}

import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { TrimString } from 'src/lib/decorators';

export class ActivityCategoryPayload {
  @TrimString()
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;
}

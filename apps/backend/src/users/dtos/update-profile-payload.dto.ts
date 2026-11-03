import { IsOptional, IsUrl, MaxLength } from 'class-validator';
import { OptionalNotNull } from 'src/lib/decorators';
import { PersonName } from 'src/lib/validators/account-fields';

export class UpdateProfilePayload {
  @OptionalNotNull()
  @PersonName('First name')
  firstName?: string;

  @OptionalNotNull()
  @PersonName('Last name')
  lastName?: string;

  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(255)
  avatarUrl?: string;
}

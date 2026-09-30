import { IsOptional } from 'class-validator';

import {
  ExistingPassword,
  NewPassword,
} from 'src/lib/validators/account-fields';

export class ChangePasswordPayload {
  @IsOptional()
  @ExistingPassword()
  currentPassword?: string;

  @NewPassword()
  newPassword!: string;
}

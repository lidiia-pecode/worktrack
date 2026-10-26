import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

import { LATEST_NOTIFICATIONS } from '../notification.constants';

/** The notifications the menu showed, so nothing unseen is marked read. */
export class MarkReadPayload {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(LATEST_NOTIFICATIONS)
  @IsUUID('all', { each: true })
  ids!: string[];
}

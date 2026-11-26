import { Transform } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';
import { toList } from 'src/lib/dtos/to-list.transform';

/** Comma-separated ids, e.g. `?projectIds=a&userIds=b,c`. */
export class PlanningRemovalCountQuery {
  @Transform(toList)
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  projectIds!: string[];

  @Transform(toList)
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  userIds!: string[];
}

import { Transform } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

const toList = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.split(',').filter(Boolean) : value;

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

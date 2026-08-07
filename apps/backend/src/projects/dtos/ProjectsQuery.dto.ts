import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQuery } from 'src/lib/dtos/PaginationQuery.dto';
import { ProjectStatus } from '../enums/project-status.enum';

export class ProjectsQuery extends PaginationQuery {
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}

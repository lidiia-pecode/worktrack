import { IsEnum, IsOptional } from 'class-validator';
import { SearchablePaginationQuery } from 'src/lib/dtos/searchable-pagination-query.dto';
import { ProjectStatus } from '../enums/project-status.enum';

export class ProjectsQuery extends SearchablePaginationQuery {
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}

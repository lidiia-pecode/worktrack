import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import {
  ProjectPayload,
  UpdateProjectPayload,
} from './dtos/ProjectPayload.dto';
import { ProjectResponse } from './dtos/ProjectResponse.dto';
import { Serialize, SerializeList } from 'src/lib/interceptors';
import { AccessGuard } from 'src/auth/guards';
import { RolesGuard } from 'src/auth/guards/RolesGuard';
import { Role } from 'src/lib/decorators';
import { UserRole } from 'src/users/enums/UserRole.enum';
import { CurrentUser } from 'src/lib/decorators';
import { User } from 'src/users/entities/user.entity';
import { ProjectActivityResponse } from './dtos/ProjectActivityResponse.dto';
import { ProjectsQuery } from './dtos/ProjectsQuery.dto';

@Controller('projects')
@UseGuards(AccessGuard)
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  @Get()
  @SerializeList(ProjectResponse)
  getAll(@Query() query: ProjectsQuery, @CurrentUser() user: User) {
    return this.service.list(query, user);
  }

  @Get(':id')
  @Serialize(ProjectResponse)
  getById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.service.getById(id, user);
  }

  @UseGuards(RolesGuard)
  @Role(UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @Post()
  @Serialize(ProjectResponse)
  create(@Body() payload: ProjectPayload, @CurrentUser() user: User) {
    return this.service.create(payload, user);
  }

  @UseGuards(RolesGuard)
  @Role(UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @Patch(':id')
  @Serialize(ProjectResponse)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: UpdateProjectPayload,
    @CurrentUser() user: User,
  ) {
    return this.service.update(id, payload, user);
  }

  @UseGuards(RolesGuard)
  @Role(UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @Patch(':id/archive')
  archive(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.service.archive(id, user);
  }

  @UseGuards(RolesGuard)
  @Role(UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @Patch(':id/unarchive')
  unarchive(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.service.unarchive(id, user);
  }

  @Get(':id/activities')
  @SerializeList(ProjectActivityResponse)
  listActivities(
    @Param('id', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: User,
  ) {
    return this.service.listActivities(projectId, user);
  }
}

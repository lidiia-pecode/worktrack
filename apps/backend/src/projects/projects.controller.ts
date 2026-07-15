import {
  Body,
  Controller,
  Delete,
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
import { PaginationQuery } from 'src/lib/dtos/PaginationQuery.dto';
import { AccessGuard } from 'src/auth/guards';
import { RolesGuard } from 'src/auth/guards/RolesGuard';
import { Role } from 'src/lib/decorators/user-role.decorator';
import { UserRole } from 'src/users/enums/UserRole.enum';
import { CurrentUser } from 'src/lib/decorators/current-user.decorator';
import { User } from 'src/users/entities/user.entity';
// import { ProjectActivityResponse } from './dtos/ProjectActivityResponse.dto';
// import { ProjectActivityPayload } from './dtos/ProjectActivity.dto';

@Controller('projects')
@UseGuards(AccessGuard)
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  @Get()
  @SerializeList(ProjectResponse)
  getAll(@Query() pagination: PaginationQuery, @CurrentUser() user: User) {
    return this.service.list(pagination, user);
  }

  @Get(':id')
  @Serialize(ProjectResponse)
  getById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.service.getById(id, user);
  }

  @UseGuards(RolesGuard)
  @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  @Serialize(ProjectResponse)
  create(@Body() payload: ProjectPayload, @CurrentUser() user: User) {
    return this.service.create(payload, user);
  }

  @UseGuards(RolesGuard)
  @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
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
  @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Delete(':id')
  archive(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.service.archive(id, user);
  }

  @Patch(':id/unarchive')
  unarchive(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.service.unarchive(id, user);
  }

  // -------------------------------------------------
  // NOT IN USE YET LEAVE FOR FUTURE ↓
  // -------------------------------------------------

  // @UseGuards(RolesGuard)
  // @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  // @Post(':id/assign')
  // assign(
  //   @Param('id', ParseUUIDPipe) projectId: string,
  //   @Body('userId', ParseUUIDPipe) userId: string,
  //   @CurrentUser() user: User,
  // ) {
  //   return this.service.assignUserToProject(projectId, userId, user);
  // }

  // @UseGuards(RolesGuard)
  // @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  // @Delete(':id/unassign/:userId')
  // unassign(
  //   @Param('id', ParseUUIDPipe) projectId: string,
  //   @Param('userId', ParseUUIDPipe) userId: string,
  //   @CurrentUser() user: User,
  // ) {
  //   return this.service.unassignUserFromProject(projectId, userId, user);
  // }

  // @Get(':id/activities')
  // @SerializeList(ProjectActivityResponse)
  // listActivities(
  //   @Param('id', ParseUUIDPipe) projectId: string,
  //   @CurrentUser() user: User,
  // ) {
  //   return this.service.listActivities(projectId, user);
  // }

  // @UseGuards(RolesGuard)
  // @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  // @Post(':id/activities')
  // @Serialize(ProjectActivityResponse)
  // addActivity(
  //   @Param('id', ParseUUIDPipe) projectId: string,
  //   @Body() payload: ProjectActivityPayload,
  //   @CurrentUser() user: User,
  // ) {
  //   return this.service.addActivity(projectId, payload, user);
  // }

  // @UseGuards(RolesGuard)
  // @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  // @Delete(':id/activities/:projectActivityId')
  // archiveActivity(
  //   @Param('id', ParseUUIDPipe) projectId: string,
  //   @Param('projectActivityId', ParseUUIDPipe) projectActivityId: string,
  //   @CurrentUser() user: User,
  // ) {
  //   return this.service.archiveActivity(projectId, projectActivityId, user);
  // }
}

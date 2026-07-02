import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AccessGuard } from 'src/auth/guards';
import { RolesGuard } from 'src/auth/guards/RolesGuard';
import { CurrentUser } from 'src/lib/decorators/current-user.decorator';
import { PaginationQuery } from 'src/lib/dtos/PaginationQuery.dto';
import { Serialize, SerializeList } from 'src/lib/interceptors';
import { User } from 'src/users/entities/user.entity';
import { ActivitiesService } from './activities.service';
import { ActivityPayload } from './dtos/ActivityPayload.dto';
import { ActivityResponse } from './dtos/ActivityResponse.dto';

@Controller('activities')
@UseGuards(AccessGuard)
export class ActivitiesController {
  constructor(private readonly service: ActivitiesService) {}

  @Get()
  @UseGuards(RolesGuard)
  @SerializeList(ActivityResponse)
  list(@Query() pagination: PaginationQuery, @CurrentUser() user: User) {
    return this.service.list(user, pagination);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Serialize(ActivityResponse)
  getById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.service.getById(id, user);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Serialize(ActivityResponse)
  create(@Body() payload: ActivityPayload, @CurrentUser() user: User) {
    return this.service.create(payload, user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Serialize(ActivityResponse)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: ActivityPayload,
    @CurrentUser() user: User,
  ) {
    return this.service.update(id, payload, user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.service.delete(id, user);
  }
}

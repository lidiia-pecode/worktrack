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
import { ActCategoriesService } from './activity-categories.service';
import { Serialize, SerializeList } from 'src/lib/interceptors';
import { PaginationQuery } from 'src/lib/dtos/PaginationQuery.dto';
import { CurrentUser } from 'src/lib/decorators/current-user.decorator';
import { User } from 'src/users/entities/user.entity';
import { ActivityCategoryResponse } from './dtos/ActivitiesCategoryResponse.dto';
import { RolesGuard } from 'src/auth/guards/RolesGuard';
import { ActivityCategoryPayload } from './dtos/ActivitiesCategoryPayload.dto';

@Controller('activity-categories')
@UseGuards(AccessGuard)
export class ActCategoriesController {
  constructor(private readonly service: ActCategoriesService) {}

  @Get()
  @SerializeList(ActivityCategoryResponse)
  list(@Query() pagination: PaginationQuery, @CurrentUser() user: User) {
    return this.service.list(user, pagination);
  }

  @Get(':id')
  @Serialize(ActivityCategoryResponse)
  getById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.service.getById(id, user);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Serialize(ActivityCategoryResponse)
  create(@Body() payload: ActivityCategoryPayload, @CurrentUser() user: User) {
    return this.service.create(payload, user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Serialize(ActivityCategoryResponse)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: ActivityCategoryPayload,
    @CurrentUser() user: User,
  ) {
    return this.service.update(id, payload, user);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(RolesGuard)
  delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.service.delete(id, user);
  }
}

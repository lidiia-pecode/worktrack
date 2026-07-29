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

import { PlanningService } from './planning.service';
import { PlanningEntryResponse } from './dtos/PlanningEntryResponse.dto';
import {
  CreatePlanningEntryDto,
  UpdatePlanningEntryDto,
} from './dtos/PlanningEntryPayload.dto';
import { PlanningQueryDto } from './dtos/PlanningQuery.dto';

import { Serialize, SerializeList } from 'src/lib/interceptors';
import { CurrentUser } from 'src/lib/decorators';
import { User } from 'src/users/entities/user.entity';
import { AccessGuard } from 'src/auth/guards';
import { RolesGuard } from 'src/auth/guards/RolesGuard';
import { Role } from 'src/lib/decorators';
import { UserRole } from 'src/users/enums/UserRole.enum';

@Controller('planning')
@UseGuards(AccessGuard)
export class PlanningController {
  constructor(private readonly service: PlanningService) {}

  @Get()
  @SerializeList(PlanningEntryResponse)
  list(@Query() query: PlanningQueryDto, @CurrentUser() user: User) {
    return this.service.list(query, user);
  }

  @Get(':id')
  @Serialize(PlanningEntryResponse)
  getById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.service.getById(id, user);
  }

  @UseGuards(RolesGuard)
  @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  @Serialize(PlanningEntryResponse)
  create(@Body() payload: CreatePlanningEntryDto, @CurrentUser() user: User) {
    return this.service.create(payload, user);
  }

  @UseGuards(RolesGuard)
  @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id')
  @Serialize(PlanningEntryResponse)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: UpdatePlanningEntryDto,
    @CurrentUser() user: User,
  ) {
    return this.service.update(id, payload, user);
  }

  @UseGuards(RolesGuard)
  @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.service.delete(id, user);
  }
}

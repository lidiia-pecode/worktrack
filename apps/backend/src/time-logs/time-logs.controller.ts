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

import { TimeLogsService } from './time-logs.service';
import { TimeLogResponse } from './dtos/TimelogResponse.dto';
import {
  TimeLogPayload,
  UpdateTimelogPayload,
} from './dtos/TimelogPayload.dto';

import { Serialize, SerializeList } from 'src/lib/interceptors';
import { CurrentUser } from 'src/lib/decorators/current-user.decorator';
import { User } from 'src/users/entities/user.entity';
import { AccessGuard } from 'src/auth/guards';
import { GetTimelogsQuery } from './dtos/GetTimelogsQuery.dto';

@Controller('time-logs')
@UseGuards(AccessGuard)
export class TimeLogsController {
  constructor(private readonly timeLogsService: TimeLogsService) {}

  @Get()
  @SerializeList(TimeLogResponse)
  async getAllTimeLogs(
    @Query() query: GetTimelogsQuery,
    @CurrentUser() user: User,
  ) {
    return this.timeLogsService.list(query, user);
  }

  @Get(':id')
  @Serialize(TimeLogResponse)
  async getTimeLogById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.timeLogsService.getById(id, user);
  }

  @Post()
  @Serialize(TimeLogResponse)
  async createTimeLog(
    @Body() payload: TimeLogPayload,
    @CurrentUser() user: User,
  ) {
    return this.timeLogsService.create(payload, user);
  }

  @Patch(':id')
  @Serialize(TimeLogResponse)
  async updateTimeLog(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: UpdateTimelogPayload,
    @CurrentUser() user: User,
  ) {
    return this.timeLogsService.update(id, payload, user);
  }

  @Delete(':id')
  async deleteTimeLog(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.timeLogsService.delete(id, user);
  }
}

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

import { AbsencesService } from './absences.service';
import { AbsenceResponse } from './dtos/absence-response.dto';
import {
  AbsencePayload,
  UpdateAbsencePayload,
} from './dtos/absence-payload.dto';

import { AbsencesQuery } from './dtos/absences-query.dto';

import { Serialize, SerializeList } from 'src/lib/interceptors';
import { CurrentUser } from 'src/lib/decorators';
import { AccessGuard } from 'src/auth/guards';
import type { AuthUser } from 'src/auth/auth-strategies/types';

@Controller('absences')
@UseGuards(AccessGuard)
export class AbsencesController {
  constructor(private readonly absencesService: AbsencesService) {}

  @Get()
  @SerializeList(AbsenceResponse)
  async getAllAbsences(
    @Query() query: AbsencesQuery,
    @CurrentUser() user: AuthUser,
  ) {
    return this.absencesService.list(query, user);
  }

  @Post()
  @Serialize(AbsenceResponse)
  async createAbsence(
    @Body() payload: AbsencePayload,
    @CurrentUser() user: AuthUser,
  ) {
    return this.absencesService.create(payload, user);
  }

  @Patch(':id')
  @Serialize(AbsenceResponse)
  async updateAbsence(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: UpdateAbsencePayload,
    @CurrentUser() user: AuthUser,
  ) {
    return this.absencesService.update(id, payload, user);
  }

  @Delete(':id')
  async deleteAbsence(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.absencesService.delete(id, user);
  }
}

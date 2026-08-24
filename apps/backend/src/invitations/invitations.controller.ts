// apps/backend/src/invitations/invitations.controller.ts

import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';

import {
  AccessGuard,
  GoogleInvitationGuard,
  RolesGuard,
} from 'src/auth/guards';

import { CookieService } from 'src/auth/services/cookie.service';
import { CurrentUser, Role } from 'src/lib/decorators';
import { InvitationToken } from 'src/lib/decorators/invitation-token.decorator';
import { ReqMetadata } from 'src/lib/decorators/req-metadata.decorator';

import type { AuthUser } from 'src/auth/auth-strategies/types';
import type { GoogleUserPayload } from 'src/auth/dtos/auth.dto';
import type { SessionMetadata } from 'src/lib/types/session-metadata';

import { UserRole } from 'src/users/enums/UserRole.enum';

import { CreateInvitationPayload } from './dtos/create-invitation.dto';
import { CompleteInvitationDto } from './dtos/complete-invitation.dto';
import { InvitationsService } from './invitations-service';

@Controller('invitations')
export class InvitationsController {
  constructor(
    private readonly invitationsService: InvitationsService,
    private readonly cookieService: CookieService,
  ) {}

  @Post()
  @UseGuards(AccessGuard, RolesGuard)
  @Role(UserRole.OWNER, UserRole.MANAGER)
  async create(
    @CurrentUser() user: AuthUser,
    @Body() payload: CreateInvitationPayload,
  ) {
    await this.invitationsService.create(user.companyId, payload);

    return {
      success: true,
    };
  }

  @Get('validate')
  async validate(@Query('token') token: string) {
    const invitation = await this.invitationsService.findByToken(token);

    return {
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    };
  }

  @Post('complete-password')
  async completeWithPassword(
    @Body() dto: CompleteInvitationDto,
    @ReqMetadata() metadata: SessionMetadata,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.invitationsService.completeWithPassword(
      dto.token,
      dto.password,
      dto.firstName,
      dto.lastName,
      metadata,
    );

    this.cookieService.setAuthCookies(
      res,
      tokens.access_token,
      tokens.refresh_token,
    );

    return {
      access_token: tokens.access_token,
    };
  }

  @Get('google')
  startGoogleInvitation(
    @Query('token') token: string,
    @Res() res: Response,
  ): void {
    this.cookieService.setInvitationFlowCookie(res, token);

    res.redirect('/invitations/google/authorize');
  }

  @Get('google/authorize')
  @UseGuards(GoogleInvitationGuard)
  authorizeGoogleInvitation(): void {}

  @Get('google/callback')
  @UseGuards(GoogleInvitationGuard)
  async completeGoogleInvitation(
    @CurrentUser() googleUser: GoogleUserPayload,
    @InvitationToken() invitationToken: string,
    @ReqMetadata() metadata: SessionMetadata,
    @Res() res: Response,
  ): Promise<void> {
    const tokens = await this.invitationsService.completeWithGoogle(
      invitationToken,
      googleUser,
      metadata,
    );

    this.cookieService.clearInvitationFlowCookie(res);

    this.cookieService.setAuthCookies(
      res,
      tokens.access_token,
      tokens.refresh_token,
    );

    res.redirect(this.cookieService.getFrontendUrl());
  }
}

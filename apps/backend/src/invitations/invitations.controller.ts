// apps/backend/src/invitations/invitations.controller.ts

import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';

import {
  AccessGuard,
  GoogleInvitationGuard,
  RolesGuard,
} from 'src/auth/guards';

import { CookieService } from 'src/auth/services/cookie.service';
import { GoogleInvitationCallbackFilter } from 'src/auth/google-callback.filter';
import {
  INVITATION_EMAILS_PER_MINUTE,
  LimitPerSession,
} from 'src/auth/rate-limit/rate-limit.decorators';
import { CurrentUser, Role } from 'src/lib/decorators';
import { Serialize } from 'src/lib/interceptors';
import { InvitationToken } from 'src/lib/decorators/invitation-token.decorator';
import { ReqMetadata } from 'src/lib/decorators/req-metadata.decorator';

import type { AuthUser } from 'src/auth/auth-strategies/types';
import type { GoogleUserPayload } from 'src/auth/dtos/auth.dto';
import type { SessionMetadata } from 'src/lib/types/session-metadata';

import { UserRole } from 'src/users/enums/user-role.enum';

import { CreateInvitationPayload } from './dtos/create-invitation.dto';
import { CompleteInvitationDto } from './dtos/complete-invitation.dto';
import { InvitationTokenQuery } from './dtos/invitation-token-query.dto';
import { PendingInvitationResponse } from './dtos/invitation-response.dto';
import { InvitationsService } from './invitations.service';

@Controller('invitations')
export class InvitationsController {
  constructor(
    private readonly invitationsService: InvitationsService,
    private readonly cookieService: CookieService,
  ) {}

  @Get()
  @UseGuards(AccessGuard, RolesGuard)
  @Role(UserRole.OWNER, UserRole.MANAGER)
  @Serialize(PendingInvitationResponse)
  async listPending(@CurrentUser() user: AuthUser) {
    return this.invitationsService.listPending(user);
  }

  @LimitPerSession(INVITATION_EMAILS_PER_MINUTE)
  @Post()
  @UseGuards(AccessGuard, RolesGuard)
  @Role(UserRole.OWNER, UserRole.MANAGER)
  async create(
    @CurrentUser() user: AuthUser,
    @Body() payload: CreateInvitationPayload,
  ) {
    await this.invitationsService.create(user.companyId, payload, user);

    return {
      success: true,
    };
  }

  @LimitPerSession(INVITATION_EMAILS_PER_MINUTE)
  @Post(':id/resend')
  @UseGuards(AccessGuard, RolesGuard)
  @Role(UserRole.OWNER, UserRole.MANAGER)
  async resend(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.invitationsService.resend(id, user);

    return {
      success: true,
    };
  }

  @Patch(':id/revoke')
  @UseGuards(AccessGuard, RolesGuard)
  @Role(UserRole.OWNER, UserRole.MANAGER)
  async revoke(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.invitationsService.revoke(id, user);

    return {
      success: true,
    };
  }

  @Get('validate')
  validate(@Query() { token = '' }: InvitationTokenQuery) {
    return this.invitationsService.describeByToken(token);
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
  async startGoogleInvitation(
    @Query() { token = '' }: InvitationTokenQuery,
    @Res() res: Response,
  ): Promise<void> {
    try {
      await this.invitationsService.assertUsableToken(token);
    } catch (error) {
      if (!(error instanceof HttpException)) throw error;

      // Back to the invitation page, which says what is wrong with the link,
      // rather than on to Google with a link that cannot be accepted.
      const frontendUrl = this.cookieService.getFrontendUrl();
      const query = new URLSearchParams({ token });

      return res.redirect(`${frontendUrl}/invitations/complete?${query}`);
    }

    this.cookieService.setInvitationFlowCookie(res, token);

    res.redirect('./google/authorize');
  }

  @Get('google/authorize')
  @UseGuards(GoogleInvitationGuard)
  authorizeGoogleInvitation(): void {}

  @Get('google/callback')
  @UseFilters(GoogleInvitationCallbackFilter)
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

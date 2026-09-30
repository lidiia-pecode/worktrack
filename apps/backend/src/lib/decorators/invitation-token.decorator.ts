import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';

import { Request } from 'express';

import { INVITATION_FLOW_COOKIE } from 'src/auth/services/cookie.service';

export const InvitationToken = createParamDecorator(
  (_: never, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<Request>();
    const invitationToken = request.cookies?.[INVITATION_FLOW_COOKIE] as
      string | undefined;

    if (!invitationToken) {
      throw new BadRequestException('Invitation token missing');
    }

    return invitationToken;
  },
);

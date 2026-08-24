import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';

import { Request } from 'express';

export const InvitationToken = createParamDecorator(
  (_: never, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<Request>();
    const invitationToken = request.cookies?.invitation_flow_token as
      string | undefined;

    if (!invitationToken) {
      throw new BadRequestException('Invitation token missing');
    }

    return invitationToken;
  },
);
